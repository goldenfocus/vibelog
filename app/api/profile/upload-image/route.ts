import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getFilterById } from '@/lib/image-filters';
import { VIBELOGS_BUCKET } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * POST /api/profile/upload-image
 *
 * Upload profile images (avatar or header) to Supabase Storage
 * Accepts multipart/form-data with image file and type
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const imageType = formData.get('type') as string; // 'avatar' or 'header'
    const cropDataString = formData.get('cropData') as string | null;
    const filterId = (formData.get('filterId') as string) || 'original';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!imageType || !['avatar', 'header'].includes(imageType)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    // Parse crop data if provided
    let cropData: CropData | null = null;
    if (cropDataString) {
      try {
        cropData = JSON.parse(cropDataString) as CropData;
      } catch (error) {
        console.error('Failed to parse crop data:', error);
        return NextResponse.json({ error: 'Invalid crop data' }, { status: 400 });
      }
    }

    // Validate file size (max 10MB for images)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 413 }
      );
    }

    // Validate file type
    const normalizedFileType = file.type.split(';')[0].trim();
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(normalizedFileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type', fileType: normalizedFileType },
        { status: 415 }
      );
    }

    // Generate storage path: userId/profile/{avatar|header}-timestamp.ext
    const extension = normalizedFileType.split('/')[1];
    const timestamp = Date.now();
    const storagePath = `${user.id}/profile/${imageType}-${timestamp}.${extension}`;

    console.log(
      `📸 Uploading ${imageType} image:`,
      storagePath,
      `(${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      cropData ? 'with crop' : 'no crop'
    );

    // Convert File to ArrayBuffer then Buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    // Process image with sharp (crop if needed, optimize)
    try {
      let sharpImage = sharp(buffer);

      // Apply crop if provided
      if (cropData) {
        sharpImage = sharpImage.extract({
          left: Math.round(cropData.x),
          top: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height),
        });
      }

      // Resize and optimize based on image type
      if (imageType === 'avatar') {
        // Avatar: resize to 400x400, high quality
        sharpImage = sharpImage.resize(400, 400, {
          fit: 'cover',
          position: 'center',
        });
      } else {
        // Header: resize to max width 1200, maintain aspect ratio
        sharpImage = sharpImage.resize(1200, null, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply filter if not original
      const filter = getFilterById(filterId);
      if (filter.sharp) {
        const { modulate, grayscale, linear } = filter.sharp;

        // Apply grayscale first if specified
        if (grayscale) {
          sharpImage = sharpImage.grayscale();
        }

        // Apply modulation (brightness, saturation, hue)
        if (modulate) {
          sharpImage = sharpImage.modulate(modulate);
        }

        // Apply linear adjustment (contrast)
        if (linear) {
          sharpImage = sharpImage.linear(linear.a, linear.b);
        }
      }

      // Convert to WebP for better compression (quality 90)
      buffer = await sharpImage.webp({ quality: 90 }).toBuffer();

      console.log(
        `✨ Image processed:`,
        `${(buffer.length / 1024).toFixed(1)}KB`,
        cropData ? `(cropped ${cropData.width}x${cropData.height})` : '',
        filterId !== 'original' ? `filter: ${filter.name}` : ''
      );
    } catch (error) {
      console.error('Image processing failed:', error);
      return NextResponse.json(
        {
          error: 'Image processing failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Update storage path to use .webp extension
    const webpStoragePath = `${user.id}/profile/${imageType}-${timestamp}.webp`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(VIBELOGS_BUCKET)
      .upload(webpStoragePath, buffer, {
        contentType: 'image/webp',
        upsert: false,
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed', message: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(VIBELOGS_BUCKET).getPublicUrl(webpStoragePath);

    console.log('✅ Upload successful:', publicUrl);

    // Update profile in database
    const updateData =
      imageType === 'avatar' ? { avatar_url: publicUrl } : { header_image: publicUrl };

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (dbError) {
      console.error('❌ Profile update failed:', dbError);
      return NextResponse.json(
        {
          error: 'Failed to update profile',
          message: dbError.message,
          details: dbError,
        },
        { status: 500 }
      );
    }

    console.log('✅ Profile updated in database');

    return NextResponse.json({
      url: publicUrl,
      storagePath: webpStoragePath,
      success: true,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
