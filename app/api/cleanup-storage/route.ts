import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface CleanupRequest {
  urls: string[];
}

/**
 * DELETE orphaned storage objects
 * Called when save fails to prevent storage leaks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { urls }: CleanupRequest = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, message: 'No URLs provided' }, { status: 400 });
    }

    console.log('🧹 [CLEANUP-STORAGE] Cleaning up', urls.length, 'orphaned files');

    // Use service role for deletion permissions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const deletionResults = {
      success: [] as string[],
      failed: [] as { url: string; error: string }[],
    };

    // Process each URL
    for (const url of urls) {
      try {
        // Extract bucket and file path from Supabase URL
        // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');

        // Find the bucket and file path
        const storageIndex = pathParts.indexOf('storage');
        if (storageIndex === -1 || pathParts.length < storageIndex + 5) {
          console.warn('⚠️ [CLEANUP-STORAGE] Invalid storage URL format:', url);
          deletionResults.failed.push({ url, error: 'Invalid URL format' });
          continue;
        }

        const bucket = pathParts[storageIndex + 4]; // /storage/v1/object/public/{bucket}
        const filePath = pathParts.slice(storageIndex + 5).join('/'); // remaining path

        console.log('🗑️ [CLEANUP-STORAGE] Deleting:', { bucket, filePath });

        // Delete from storage
        const { error } = await supabase.storage.from(bucket).remove([filePath]);

        if (error) {
          console.error('❌ [CLEANUP-STORAGE] Failed to delete:', filePath, error);
          deletionResults.failed.push({ url, error: error.message });
        } else {
          console.log('✅ [CLEANUP-STORAGE] Deleted:', filePath);
          deletionResults.success.push(url);
        }
      } catch (parseError) {
        console.error('❌ [CLEANUP-STORAGE] Error processing URL:', url, parseError);
        deletionResults.failed.push({
          url,
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
        });
      }
    }

    console.log('📊 [CLEANUP-STORAGE] Results:', {
      total: urls.length,
      success: deletionResults.success.length,
      failed: deletionResults.failed.length,
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletionResults.success.length}/${urls.length} files`,
      results: deletionResults,
    });
  } catch (error) {
    console.error('💥 [CLEANUP-STORAGE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Storage cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
