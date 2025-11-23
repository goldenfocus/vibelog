import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { uploadCover } from '@/lib/cover-storage';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vibelogId = formData.get('vibelogId') as string;

    if (!file || !vibelogId) {
      return NextResponse.json({ error: 'Missing file or vibelogId' }, { status: 400 });
    }

    // Verify ownership
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('user_id, title')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize and optimize (auto-rotate based on EXIF first)
    const processed = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(1920, 1080, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload using modular cover storage utility
    const { url: imageUrl, error: uploadError } = await uploadCover(
      vibelogId,
      processed,
      'image/jpeg'
    );

    if (uploadError || !imageUrl) {
      console.error('Failed to upload cover:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Update vibelog with new cover image
    await supabase
      .from('vibelogs')
      .update({
        cover_image_url: imageUrl,
        cover_image_alt: vibelog.title,
        cover_image_width: 1920,
        cover_image_height: 1080,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    return NextResponse.json({
      success: true,
      url: imageUrl,
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
