"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Circle, Copy, Share, Save, Check, Sparkles, Image, Search, FileText, Volume2, Brain, Zap, Play, Pause, Edit, X, LogIn } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import Waveform from "@/components/mic/Waveform";
import { AudioEngine } from "@/components/mic/AudioEngine";
import Controls, { RecordingState } from "@/components/mic/Controls";
import TranscriptionPanel from "@/components/mic/TranscriptionPanel";
import PublishActions from "@/components/mic/PublishActions";
import ProcessingAnimation from "@/components/mic/ProcessingAnimation";

// Extend Window interface for webkitAudioContext and SpeechRecognition
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}



export default function MicRecorder() {
  const { t } = useI18n();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcription, setTranscription] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [isTeaserContent, setIsTeaserContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  // TODO: Replace with actual auth state
  const [isLoggedIn] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackLevels, setPlaybackLevels] = useState<number[]>(Array.from({ length: 15 }, () => 0.15));
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const [toast, setToast] = useState<{message: string; visible: boolean}>({message: "", visible: false});
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Audio recording refs
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const recordingTimer = useRef<number | null>(null);
  
  // Enhanced fluid bars with real audio data
  const bars = 15;
  const levelsRef = useRef<number[]>(Array.from({ length: bars }, () => 0.1));
  const [, force] = useState(0);

  // Initialize AudioEngine
  useEffect(() => {
    audioEngineRef.current = new AudioEngine({
      onPermissionChange: setHasPermission,
      onLevelsUpdate: (levels) => {
        levelsRef.current = levels;
        force((x) => x + 1);
      },
      onDataAvailable: (blob, duration) => {
        console.log('Audio data available:', blob.size, 'duration:', duration);
        setDuration(duration);
        setAudioBlob(blob);
        
        // Start AI processing
        setTimeout(() => {
          processAudioWithAI(blob);
        }, 100);
      },
      onError: (error) => {
        showToast(error);
      }
    });

    return () => {
      audioEngineRef.current?.cleanup();
    };
  }, []);

  // Audio visualization is now handled by AudioEngine via callbacks

  // Playback audio visualization
  useEffect(() => {
    if (isPlaying && playbackAnalyserRef.current) {
      const analyser = playbackAnalyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const loop = () => {
        if (!isPlaying) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Map frequency data to playback bars (same logic as recording)
        const newLevels = [...playbackLevels];
        const bars = 15;
        
        for (let i = 0; i < bars; i++) {
          const minFreq = 0;
          const maxFreq = bufferLength * 0.7;
          const freq = minFreq + (maxFreq - minFreq) * Math.pow(i / (bars - 1), 1.5);
          
          const start = Math.floor(freq);
          const end = Math.min(start + Math.floor(bufferLength / bars) + 1, bufferLength);
          let sum = 0;
          let count = 0;
          
          for (let j = start; j < end && j < bufferLength; j++) {
            sum += dataArray[j];
            count++;
          }
          
          const average = count > 0 ? sum / count : 0;
          let normalized = (average / 255) * 2.5; // Slightly less aggressive for playback
          normalized = Math.pow(normalized, 0.6);
          normalized = Math.max(0.1, Math.min(1, normalized));
          
          // Smooth transition
          newLevels[i] += (normalized - newLevels[i]) * 0.5;
        }
        
        setPlaybackLevels(newLevels);
        playbackRafRef.current = requestAnimationFrame(loop);
      };
      
      playbackRafRef.current = requestAnimationFrame(loop);
    } else if (!isPlaying) {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      // Fade to minimum when not playing
      setPlaybackLevels(Array.from({ length: 15 }, () => 0.1));
    }
    
    return () => {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
      }
    };
  }, [isPlaying]);

  // Real-time speech recognition with better browser support
  useEffect(() => {
    if (recordingState === "recording") {
      // Check for Speech Recognition API support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;
          
          let finalTranscript = '';
          let isBlocked = false; // Track if browser blocked the feature
          
          recognition.onstart = () => {
            console.log('Speech recognition started');
            setLiveTranscript(t('components.micRecorder.listening'));
          };
          
          recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }
            
            // Combine final and interim results
            const currentTranscript = (finalTranscript + interimTranscript).trim();
            if (currentTranscript) {
              setLiveTranscript(currentTranscript);
            }
          };
          
          recognition.onerror = (event) => {
            console.log('Speech recognition error:', event.error, event);
            
            // Handle different error types - but DON'T retry for blocked cases
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              isBlocked = true;
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
            } else if (event.error === 'network') {
              isBlocked = true;
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
            } else if (event.error === 'no-speech') {
              setLiveTranscript(t('components.micRecorder.speakLouder'));
              // Only retry for no-speech, not for blocked cases
              if (!isBlocked) {
                setTimeout(() => {
                  if (recordingState === "recording" && speechRecognitionRef.current && !isBlocked) {
                    try {
                      speechRecognitionRef.current.start();
                    } catch (e) {
                      console.log('Could not restart after no-speech:', e);
                      setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
                    }
                  }
                }, 3000); // Only retry after longer pause for no-speech
              }
            } else if (event.error === 'aborted') {
              if (!isBlocked) {
                setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
              }
            } else {
              setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
            }
          };
          
          recognition.onend = () => {
            console.log('Speech recognition ended');
            // DON'T restart if blocked - just leave it in a stable state
            if (isBlocked) {
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
              return;
            }
            
            // Only restart for normal end events, not blocked ones
            if (recordingState === "recording" && speechRecognitionRef.current && !isBlocked) {
              setTimeout(() => {
                try {
                  if (recordingState === "recording" && speechRecognitionRef.current && !isBlocked) {
                    speechRecognitionRef.current.start();
                  }
                } catch (e) {
                  console.log('Could not restart recognition:', e);
                  setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
                }
              }, 1000);
            }
          };
          
          speechRecognitionRef.current = recognition;
          recognition.start();
        } catch (error) {
          console.log('Speech recognition initialization error:', error);
          setLiveTranscript('Recording...\n(live transcript unavailable)');
        }
      } else {
        // Fallback for browsers without Speech Recognition (like Brave in strict mode)
        console.log('Speech Recognition API not available');
        setLiveTranscript(t('components.micRecorder.recordingNotSupported'));
      }
    } else {
      // Stop recognition when not recording
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
        speechRecognitionRef.current = null;
      }
      if (recordingState === "idle") {
        setLiveTranscript('');
      }
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          console.log('Cleanup recognition error:', e);
        }
        speechRecognitionRef.current = null;
      }
    };
  }, [recordingState]);

  // Request microphone permission and start recording
  const handleStartRecording = async () => {
    if (!audioEngineRef.current) return;
    
    const success = await audioEngineRef.current.startRecording();
    if (success) {
      setRecordingState("recording");
      setTranscription("");
      setBlogContent("");
      setIsTeaserContent(false);
      setProcessingSteps([]);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimer.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    if (!audioEngineRef.current) return;
    
    // Stop the AudioEngine
    audioEngineRef.current.stopRecording();
    
    // Clear the recording timer
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    setRecordingState("processing");
    
    // Define magical processing steps
    const steps: ProcessingStep[] = [
      { id: "capture", label: t('components.micRecorder.symphony.capture'), icon: <Volume2 className="w-4 h-4" />, completed: false },
      { id: "transcribe", label: t('components.micRecorder.symphony.transcribe'), icon: <FileText className="w-4 h-4" />, completed: false },
      { id: "clean", label: t('components.micRecorder.symphony.clean'), icon: <Zap className="w-4 h-4" />, completed: false },
      { id: "expand", label: t('components.micRecorder.symphony.expand'), icon: <Brain className="w-4 h-4" />, completed: false },
      { id: "structure", label: t('components.micRecorder.symphony.structure'), icon: <Search className="w-4 h-4" />, completed: false },
      { id: "format", label: t('components.micRecorder.symphony.format'), icon: <Sparkles className="w-4 h-4" />, completed: false },
      { id: "optimize", label: t('components.micRecorder.symphony.optimize'), icon: <Zap className="w-4 h-4" />, completed: false },
      { id: "social", label: t('components.micRecorder.symphony.social'), icon: <Share className="w-4 h-4" />, completed: false },
      { id: "seo", label: t('components.micRecorder.symphony.seo'), icon: <Search className="w-4 h-4" />, completed: false },
      { id: "rss", label: t('components.micRecorder.symphony.rss'), icon: <Volume2 className="w-4 h-4" />, completed: false },
      { id: "html", label: t('components.micRecorder.symphony.html'), icon: <Zap className="w-4 h-4" />, completed: false },
      { id: "polish", label: t('components.micRecorder.symphony.polish'), icon: <Sparkles className="w-4 h-4" />, completed: false },
    ];
    
    setProcessingSteps(steps);
  };

  const handleReset = () => {
    // Clean up any ongoing recording
    if (audioEngineRef.current) {
      audioEngineRef.current.cleanup();
    }
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    
    setRecordingState("idle");
    setTranscription("");
    setLiveTranscript("");
    setBlogContent("");
    setIsTeaserContent(false);
    setProcessingSteps([]);
    setVisibleStepIndex(0);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const showToast = (message: string) => {
    setToast({message, visible: true});
    setTimeout(() => setToast({message: "", visible: false}), 3000);
  };

  const createTeaserContent = (fullContent: string, transcription: string) => {
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

  const renderBlogContent = (content: string, isTeaser: boolean = false) => {
    // Parse title and content
    let title = '';
    let subtitle = '';
    let bodyContent = content;
    
    // Check for "Title: " pattern and extract it
    const titleMatch = content.match(/^(?:Title:\s*)?(.+?)(?:\n\n(.+?))?(?:\n\n([\s\S]*?))?$/);
    if (titleMatch) {
      const fullTitle = titleMatch[1] || '';
      const possibleSubtitle = titleMatch[2] || '';
      const remainingContent = titleMatch[3] || '';
      
      // Split long titles into title + subtitle
      if (fullTitle.length > 50) {
        const colonIndex = fullTitle.indexOf(':');
        if (colonIndex > 0 && colonIndex < fullTitle.length - 10) {
          title = fullTitle.substring(0, colonIndex);
          subtitle = fullTitle.substring(colonIndex + 1).trim();
        } else {
          // Split at natural break point
          const words = fullTitle.split(' ');
          const midPoint = Math.ceil(words.length / 2);
          title = words.slice(0, midPoint).join(' ');
          subtitle = words.slice(midPoint).join(' ');
        }
      } else {
        title = fullTitle;
        subtitle = possibleSubtitle;
      }
      
      bodyContent = remainingContent || subtitle || '';
      if (bodyContent === subtitle) subtitle = '';
    }
    
    return (
      <div>
        {/* Title */}
        {title && (
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent mb-2 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <h2 className="text-xl sm:text-2xl text-muted-foreground font-medium leading-relaxed">
                {subtitle}
              </h2>
            )}
          </div>
        )}
        
        {/* Body content */}
        <div className="whitespace-pre-wrap">
          <div dangerouslySetInnerHTML={{ __html: bodyContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
        
        {/* Teaser CTA if applicable */}
        {isTeaser && (
          <div className="mt-6 p-4 bg-gradient-to-r from-electric/5 to-transparent border border-electric/20 rounded-xl">
            <div className="flex items-center gap-2 text-electric">
              <span className="text-xl">🔒</span>
              <span className="font-semibold">
                <button 
                  onClick={() => window.open('/pricing', '_blank')}
                  className="underline hover:text-electric-glow transition-colors cursor-pointer"
                >
                  {t('navigation.signUp')}
                </button>
                {' '}{t('components.micRecorder.unlockMessage')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };


  const handleCopy = async (content: string) => {
    try {
      // Add signature to the content
      const contentWithSignature = content + '\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang';
      await navigator.clipboard.writeText(contentWithSignature);
      showToast(t('toast.copied'));
    } catch (err) {
      showToast(t('toast.copyFailed'));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('share.title'),
          text: blogContent,
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy(blogContent);
          showToast(t('toast.copiedForSharing'));
        }
      }
    } else {
      handleCopy(blogContent);
      showToast(t('toast.copiedForSharing'));
    }
  };

  const handleSave = () => {
    if (!isLoggedIn) {
      // Login handling is now done by PublishActions
      return;
    }
    // TODO: Implement actual save functionality
    showToast('Vibelog saved successfully!');
  };

  const handleEdit = () => {
    if (!isLoggedIn) {
      // Login handling is now done by PublishActions
      return;
    }
    setEditedContent(blogContent);
    setIsEditing(true);
  };

  const handleTranscriptEdit = () => {
    if (!isLoggedIn) {
      // Login handling is now done by TranscriptionPanel
      return;
    }
    setIsEditingTranscript(true);
  };

  const handleTranscriptUpdate = (newTranscription: string) => {
    setTranscription(newTranscription);
    setIsEditingTranscript(false);
    showToast('Transcript updated successfully!');
  };

  const handleSaveEdit = () => {
    setBlogContent(editedContent);
    setIsEditing(false);
    showToast('Vibelog updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditedContent("");
    setIsEditing(false);
  };

  // Shared data for transcription and blog generation
  const processingDataRef = useRef<{ transcriptionData: string; blogContentData: string }>({ transcriptionData: '', blogContentData: '' });

  // AI processing functions for ProcessingAnimation
  const doTranscription = async () => {
    const audioFile = audioBlob;
    if (!audioFile) {
      console.error('No audio blob available for processing');
      throw new Error('No audio blob available');
    }

    try {
      console.log('🎙️ Starting real AI transcription...');
      
      const formData = new FormData();
      formData.append('audio', audioFile, 'recording.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { transcription } = await transcribeResponse.json();
      console.log('✅ Transcription completed:', transcription.substring(0, 100) + '...');
      processingDataRef.current.transcriptionData = transcription;
      setTranscription(transcription);
      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const doBlogGeneration = async () => {
    try {
      const transcriptionData = processingDataRef.current.transcriptionData;
      if (!transcriptionData) {
        console.error('No transcription data available for blog generation');
        throw new Error('No transcription data available');
      }
      
      console.log('🤖 Starting AI blog generation with transcription:', transcriptionData.substring(0, 50) + '...');
      
      const blogResponse = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription: transcriptionData }),
      });

      if (!blogResponse.ok) {
        const errorText = await blogResponse.text();
        console.error('Blog generation failed with status:', blogResponse.status, 'Error:', errorText);
        throw new Error(`Blog generation failed: ${blogResponse.status}`);
      }

      const { blogContent } = await blogResponse.json();
      console.log('✅ Blog generation completed:', blogContent.substring(0, 100) + '...');
      
      // Apply teaser logic
      const teaserResult = createTeaserContent(blogContent, transcriptionData);
      processingDataRef.current.blogContentData = teaserResult.content;
      setBlogContent(teaserResult.content);
      setIsTeaserContent(teaserResult.isTeaser);
      return teaserResult.content;
    } catch (error) {
      console.error('Blog generation error:', error);
      throw error;
    }
  };

  const processAudioWithAI = async (blob?: Blob) => {
    const audioFile = blob || audioBlob;
    if (!audioFile) {
      console.error('No audio blob available for processing');
      return;
    }

    // Reset processing data
    processingDataRef.current = { transcriptionData: '', blogContentData: '' };

    try {
      // The ProcessingAnimation component will handle the API calls and completion
      // No additional logic needed here - animation component manages everything
    } catch (error) {
      console.error('AI processing error:', error);
      // Show error message instead of demo content
      setRecordingState("complete");
      showToast('AI processing failed - please try recording again');
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('Seeking clicked, duration:', duration);
    if (!audioRef.current || !duration || isNaN(duration) || duration <= 0) {
      console.log('Cannot seek: missing audio or duration');
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;
    
    console.log('Seek calculation:', { clickX, width: rect.width, seekTime, duration });
    
    // Ensure seekTime is valid and finite
    if (isFinite(seekTime) && seekTime >= 0 && seekTime <= duration) {
      console.log('Setting currentTime to:', seekTime);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    } else {
      console.log('Invalid seek time:', seekTime);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Control functions now handled by Controls.tsx component
  const getTimeLimit = () => 300; // 5 minutes for free plan
  const hasReachedTimeLimit = () => recordingTime >= getTimeLimit();

  // Auto-stop when time limit is reached
  useEffect(() => {
    if (recordingState === "recording" && hasReachedTimeLimit()) {
      handleStopRecording();
      showToast('Recording stopped - Free plan limit reached (5 minutes)');
    }
  }, [recordingTime, recordingState]);

  // Create audio URL from blob
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', url);
      setAudioUrl(url);
      
      // Force load metadata to get real duration
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load(); // Force reload
          console.log('Forced audio reload');
        }
      }, 100);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      <Controls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onReset={handleReset}
      />

      {/* Real-time audio visualization */}
      {recordingState === "recording" && (
        <Waveform 
          levels={levelsRef.current}
          isActive={recordingState === "recording"}
          variant="recording"
        />
      )}

      {/* Transcription Panel */}
      <TranscriptionPanel
        transcription={transcription}
        liveTranscript={liveTranscript}
        isRecording={recordingState === "recording"}
        isComplete={recordingState === "complete"}
        onCopy={handleCopy}
        onEdit={handleTranscriptEdit}
        onTranscriptUpdate={handleTranscriptUpdate}
        isLoggedIn={isLoggedIn}
      />

      {/* Magical Processing Symphony */}
      <ProcessingAnimation
        isVisible={recordingState === "processing"}
        recordingTime={recordingTime}
        onTranscribeComplete={doTranscription}
        onGenerateComplete={doBlogGeneration}
        onAnimationComplete={() => {
          setTimeout(() => {
            setRecordingState("complete");
          }, 300);
        }}
      />

      {/* Custom Audio Player */}
      {audioBlob && recordingState === "complete" && (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            {t('components.micRecorder.yourRecording')}
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="flex items-center justify-center w-12 h-12 bg-gradient-electric text-white rounded-full hover:shadow-[0_10px_20px_rgba(97,144,255,0.3)] transition-all duration-200"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-mono min-w-[40px]">
                {formatAudioTime(currentTime)}
              </span>
              
              <div 
                onClick={handleSeek}
                className="flex-1 h-2 bg-muted/30 rounded-full cursor-pointer group relative"
              >
                <div 
                  className="h-full bg-gradient-electric rounded-full transition-all duration-75 relative"
                  style={{ width: `${(duration && !isNaN(duration) && duration > 0) ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-electric rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 transform translate-x-2" />
                </div>
              </div>
              
              <span className="text-sm text-muted-foreground font-mono min-w-[40px] text-right">
                {formatAudioTime(duration)}
              </span>
            </div>
          </div>
          
          {/* Playback Equalizer */}
          {isPlaying && (
            <Waveform 
              levels={playbackLevels}
              isActive={isPlaying}
              variant="playback"
            />
          )}
          
          <audio 
            ref={audioRef}
            src={audioUrl || undefined}
            preload="metadata"
            onLoadedMetadata={() => {
              console.log('Audio metadata loaded, duration:', audioRef.current?.duration);
              const dur = audioRef.current?.duration;
              if (audioRef.current && dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
                console.log('Setting duration:', dur);
                setDuration(dur);
              }
            }}
            onCanPlay={() => {
              console.log('Audio can play, duration:', audioRef.current?.duration);
              const dur = audioRef.current?.duration;
              if (audioRef.current && dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
                console.log('Setting duration from canPlay:', dur);
                setDuration(dur);
              }
            }}
            onDurationChange={() => {
              console.log('Duration changed:', audioRef.current?.duration);
              const dur = audioRef.current?.duration;
              if (audioRef.current && dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
                console.log('Setting duration from durationChange:', dur);
                setDuration(dur);
              }
            }}
            onLoadedData={() => {
              console.log('Audio data loaded, duration:', audioRef.current?.duration);
              const dur = audioRef.current?.duration;
              if (audioRef.current && dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
                console.log('Setting duration from loadedData:', dur);
                setDuration(dur);
              }
            }}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
              }
            }}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => {
              setIsPlaying(true);
              // Start playback visualization
              if (!playbackAnalyserRef.current && audioRef.current) {
                try {
                  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  const source = audioContext.createMediaElementSource(audioRef.current);
                  const analyser = audioContext.createAnalyser();
                  
                  analyser.fftSize = 512;
                  analyser.smoothingTimeConstant = 0.8;
                  source.connect(analyser);
                  analyser.connect(audioContext.destination);
                  
                  playbackContextRef.current = audioContext;
                  playbackAnalyserRef.current = analyser;
                  
                  console.log('Playback analyser created');
                } catch (error) {
                  console.error('Error creating playback analyser:', error);
                }
              }
            }}
            onPause={() => {
              setIsPlaying(false);
              if (playbackRafRef.current) {
                cancelAnimationFrame(playbackRafRef.current);
                playbackRafRef.current = null;
              }
            }}
            onError={(e) => console.error('Audio error:', e)}
            className="hidden"
          />
        </div>
      )}

      {/* Results */}
      {(transcription || blogContent) && recordingState === "complete" && (
        <div className="space-y-8">
          {/* Transcription is now handled by TranscriptionPanel above */}

          {blogContent && (
            <div className="bg-card rounded-2xl border border-border/20 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  {t('recorder.polishedVibelog')}
                </h3>
                
                {/* Publish Actions */}
                <PublishActions
                  content={blogContent}
                  isLoggedIn={isLoggedIn}
                  onCopy={() => handleCopy(blogContent)}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onShare={handleShare}
                  showSignature={false}
                />
              </div>
              <div className="prose prose-lg max-w-none text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>ul]:text-muted-foreground [&>strong]:text-foreground [&_a]:text-electric [&_a]:underline [&_a:hover]:text-electric-glow [&_a]:transition-colors [&_a]:cursor-pointer">
                {renderBlogContent(blogContent, isTeaserContent)}
              </div>
              
              {/* Creator Attribution */}
              <div className="mt-6 pt-4 border-t border-border/5">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>{t('components.micRecorder.createdBy')}</span>
                  <button 
                    onClick={() => window.open('https://vibelog.io/vibeyang', '_blank')}
                    className="text-electric hover:text-electric-glow transition-colors font-medium"
                  >
                    @vibeyang
                  </button>
                  <button 
                    onClick={() => window.open('https://vibelog.io/vibeyang', '_blank')}
                    className="text-muted-foreground hover:text-electric transition-colors"
                  >
                    vibelog.io/vibeyang
                  </button>
                </div>
              </div>
              
              {/* Bottom action buttons - same as top layout */}
              <div className="mt-8 border-t border-border/10 pt-6">
                <PublishActions
                  content={blogContent}
                  isLoggedIn={isLoggedIn}
                  onCopy={() => handleCopy(blogContent)}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onShare={handleShare}
                  showSignature={false}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 z-50 animate-[toastSlideUp_0.4s_ease-out] transform -translate-x-1/2">
          <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-xl max-w-sm">
            <p className="text-center text-sm font-medium text-foreground">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Popups are now handled by PublishActions component */}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Edit Your Vibelog</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-full resize-none bg-background/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors"
                placeholder="Edit your vibelog content..."
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes toastSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .star-wars-crawl {
          transform-style: preserve-3d;
          animation: crawlUp 20s linear infinite;
        }

        .crawl-step {
          transform-style: preserve-3d;
          transform: rotateX(8deg);
          margin-bottom: 2rem;
          animation: fadeInScale 1.5s ease-out;
          transform-origin: center center;
        }

        @keyframes crawlUp {
          0% {
            transform: translateY(0) rotateX(8deg);
          }
          100% {
            transform: translateY(-80%) rotateX(8deg);
          }
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: rotateX(8deg);
          }
          100% {
            opacity: 1;
            transform: rotateX(8deg);
          }
        }

        @media (min-width: 768px) {
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: rotateX(12deg);
            }
            100% {
              opacity: 1;
              transform: rotateX(12deg);
            }
          }
        }

        /* Custom glow effects for symphony text */
        .glow-text-active {
          text-shadow: 0 0 20px rgba(97, 144, 255, 0.8), 
                       0 0 40px rgba(97, 144, 255, 0.6), 
                       0 0 60px rgba(97, 144, 255, 0.4);
          animation: pulseGlow 6s ease-in-out infinite alternate;
        }

        .glow-text-secondary {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 
                       0 0 20px rgba(255, 255, 255, 0.2);
        }

        .glow-text-completed {
          text-shadow: 0 0 15px rgba(97, 144, 255, 0.6), 
                       0 0 25px rgba(97, 144, 255, 0.4), 
                       0 0 35px rgba(97, 144, 255, 0.3);
        }

        @keyframes pulseGlow {
          0% {
            text-shadow: 0 0 20px rgba(97, 144, 255, 0.8), 
                         0 0 40px rgba(97, 144, 255, 0.6), 
                         0 0 60px rgba(97, 144, 255, 0.4);
          }
          100% {
            text-shadow: 0 0 30px rgba(97, 144, 255, 1), 
                         0 0 50px rgba(97, 144, 255, 0.8), 
                         0 0 80px rgba(97, 144, 255, 0.6);
          }
        }

        /* Slightly more perspective for larger screens */
        @media (min-width: 768px) {
          .crawl-step {
            transform: rotateX(12deg);
            margin-bottom: 2.5rem;
            transform-origin: center center;
          }
          
          .star-wars-crawl {
            animation: crawlUpDesktop 18s linear infinite;
          }
          
          @keyframes crawlUpDesktop {
            0% {
              transform: translateY(0) rotateX(12deg);
            }
            100% {
              transform: translateY(-85%) rotateX(12deg);
            }
          }
        }
      `}</style>
    </div>
  );
}
