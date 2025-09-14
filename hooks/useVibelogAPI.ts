import { useRef } from "react";
import { 
  TranscriptionResponse, 
  BlogGenerationResponse, 
  TeaserResult, 
  UpgradePromptState,
  ProcessingData 
} from "@/types/micRecorder";

export interface UseVibelogAPIReturn {
  processTranscription: (audioBlob: Blob) => Promise<string>;
  processBlogGeneration: (transcription: string) => Promise<TeaserResult>;
  processingData: React.MutableRefObject<ProcessingData>;
}

export function useVibelogAPI(
  onUpgradePrompt: (prompt: UpgradePromptState) => void
): UseVibelogAPIReturn {
  // Shared data for transcription and blog generation
  const processingDataRef = useRef<ProcessingData>({ 
    transcriptionData: '', 
    blogContentData: '' 
  });

  const createTeaserContent = (fullContent: string, transcription: string): TeaserResult => {
    const wordCount = transcription.split(/\s+/).filter(word => word.length > 0).length;
    
    // For very short recordings (under 10 words), show full content without signup
    if (wordCount < 10) {
      return { content: fullContent, isTeaser: false };
    }
    
    // For short but meaningful content (10-30 words), show full content WITH signup prompt
    if (wordCount < 30) {
      return { content: fullContent, isTeaser: true };
    }
    
    // For longer content, show ~600-700 characters as teaser (consistent across languages)
    const targetTeaserLength = 650;
    
    if (fullContent.length <= targetTeaserLength) {
      return { content: fullContent, isTeaser: true };
    }
    
    // Find the best sentence break near the target length
    const sentences = fullContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let teaserContent = '';
    let currentLength = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const nextSentence = sentences[i].trim() + '.';
      if (currentLength + nextSentence.length <= targetTeaserLength + 100) { // Allow 100 char buffer
        teaserContent += nextSentence + (i < sentences.length - 1 ? ' ' : '');
        currentLength += nextSentence.length + 1;
      } else {
        break;
      }
    }
    
    // Ensure we have at least one sentence
    if (!teaserContent) {
      teaserContent = sentences[0].trim() + '.';
    }
    
    return { 
      content: teaserContent,
      isTeaser: true,
      fullContent
    };
  };

  const handleAPIError = async (response: Response): Promise<never> => {
    if (response.status === 429) {
      try {
        const errorData = await response.json();
        if (errorData.upgrade) {
          // Show upgrade prompt instead of error
          onUpgradePrompt({
            visible: true,
            message: errorData.message || 'Daily limit reached. Sign in to get more requests!',
            benefits: errorData.upgrade.benefits || [],
            resetTime: errorData.reset
          });
          throw new Error('UPGRADE_PROMPT_SHOWN'); // Special error to stop processing
        }
        // If we got JSON but no upgrade info, throw with the parsed error
        console.error(`API failed with status ${response.status}:`, errorData);
        throw new Error(`API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      } catch (jsonError) {
        // If JSON parsing fails, try to get text (but response may already be consumed)
        try {
          const errorText = await response.text();
          console.error(`API failed with status ${response.status}:`, errorText);
          throw new Error(`API failed: ${response.status} - ${errorText}`);
        } catch (textError) {
          // If both JSON and text fail, just use status
          console.error(`API failed with status ${response.status}`);
          throw new Error(`API failed: ${response.status}`);
        }
      }
    } else {
      // For non-429 errors, try to get error text
      try {
        const errorText = await response.text();
        console.error(`API failed with status ${response.status}:`, errorText);
        throw new Error(`API failed: ${response.status} - ${errorText}`);
      } catch (textError) {
        console.error(`API failed with status ${response.status}`);
        throw new Error(`API failed: ${response.status}`);
      }
    }
  };

  const processTranscription = async (audioFile: Blob): Promise<string> => {
    if (!audioFile) {
      console.error('No audio blob available for processing');
      throw new Error('No audio blob available');
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioFile, 'recording.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        await handleAPIError(transcribeResponse);
      }

      const { transcription }: TranscriptionResponse = await transcribeResponse.json();
      
      if (!transcription) {
        throw new Error('No transcription received from API');
      }
      
      processingDataRef.current.transcriptionData = transcription;
      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const processBlogGeneration = async (transcriptionData: string): Promise<TeaserResult> => {
    try {
      if (!transcriptionData) {
        console.error('No transcription data available for blog generation');
        throw new Error('No transcription data available');
      }
      
      const blogResponse = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription: transcriptionData }),
      });

      if (!blogResponse.ok) {
        await handleAPIError(blogResponse);
      }

      const { blogContent }: BlogGenerationResponse = await blogResponse.json();
      
      if (!blogContent) {
        throw new Error('No blog content received from API');
      }
      
      // Apply teaser logic
      const teaserResult = createTeaserContent(blogContent, transcriptionData);
      processingDataRef.current.blogContentData = teaserResult.content;
      
      return teaserResult;
    } catch (error) {
      console.error('Blog generation error:', error);
      throw error;
    }
  };

  return {
    processTranscription,
    processBlogGeneration,
    processingData: processingDataRef,
  };
}