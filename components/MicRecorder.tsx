"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Circle, Copy, Share, Save, Check, Sparkles, Image, Search, FileText, Volume2, Brain, Zap, Play, Pause } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

// Extend Window interface for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

type RecordingState = "idle" | "recording" | "processing" | "complete";

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function MicRecorder() {
  const { t } = useI18n();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcription, setTranscription] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [blogContent, setBlogContent] = useState("");
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
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [toast, setToast] = useState<{message: string; visible: boolean}>({message: "", visible: false});
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Enhanced fluid bars with real audio data
  const bars = 15;
  const raf = useRef<number | null>(null);
  const levelsRef = useRef<number[]>(Array.from({ length: bars }, () => 0.1));
  const [, force] = useState(0);
  const transcriptInterval = useRef<number | null>(null);

  // Real audio visualization
  useEffect(() => {
    if (recordingState === "recording" && analyserRef.current) {
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const loop = () => {
        if (recordingState !== "recording") return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Map frequency data to our bars with better distribution
        const arr = levelsRef.current;
        
        for (let i = 0; i < bars; i++) {
          // Logarithmic mapping for better frequency distribution
          const minFreq = 0;
          const maxFreq = bufferLength * 0.7; // Focus on lower-mid frequencies where voice lives
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
          // Super sensitive normalization - amplify quiet sounds  
          let normalized = (average / 255) * 3; // 3x amplification for better dynamic range
          normalized = Math.pow(normalized, 0.5); // Square root for better sensitivity curve
          normalized = Math.max(0.15, Math.min(1, normalized)); // Higher minimum for always-visible movement
          
          // Smooth the transition
          arr[i] += (normalized - arr[i]) * 0.4;
        }
        
        force((x) => x + 1);
        raf.current = requestAnimationFrame(loop);
      };
      
      raf.current = requestAnimationFrame(loop);
    } else if (recordingState !== "recording") {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
      // Fade bars to minimum when not recording
      const arr = levelsRef.current;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = 0.15;
      }
      force((x) => x + 1);
    }
    
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [recordingState]);

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

  // Live transcription simulation
  useEffect(() => {
    if (recordingState === "recording") {
      if (transcriptInterval.current) {
        clearInterval(transcriptInterval.current);
      }
      setLiveTranscript("");
      const sample = t('demo.transcriptionSample');
      let i = 0;
      transcriptInterval.current = window.setInterval(() => {
        if (i < sample.length) {
          setLiveTranscript(sample.substring(0, i + 1));
          i++;
        } else {
          if (transcriptInterval.current) {
            clearInterval(transcriptInterval.current);
            transcriptInterval.current = null;
          }
        }
      }, 50);
    } else {
      if (transcriptInterval.current) {
        clearInterval(transcriptInterval.current);
        transcriptInterval.current = null;
      }
    }
    return () => {
      if (transcriptInterval.current) {
        clearInterval(transcriptInterval.current);
      }
    };
  }, [recordingState]);

  // Request microphone permission and start recording
  const handleStartRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      // Set up audio analysis for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle recorded data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Capture recording time in closure - this will be the actual duration
      let actualRecordingTime = 0;
      const startTime = Date.now();
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Calculate actual recording time based on real elapsed time
        actualRecordingTime = Math.round((Date.now() - startTime) / 1000);
        
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        console.log('Recording stopped, blob size:', blob.size, 'actual recording time:', actualRecordingTime);
        setAudioBlob(blob);
        
        // Set duration immediately using actual time
        console.log('Setting duration immediately to:', actualRecordingTime);
        setDuration(actualRecordingTime);
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState("recording");
      setTranscription("");
      setBlogContent("");
      setProcessingSteps([]);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimer.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setHasPermission(false);
      showToast('Microphone access denied. Please allow microphone access to record.');
    }
  };

  const handleStopRecording = () => {
    // Store recording time BEFORE doing anything else
    const finalRecordingTime = recordingTime;
    console.log('Stopping recording, current recordingTime state:', recordingTime);
    
    // Also manually store it for the blob creation
    const recordedSeconds = finalRecordingTime;
    
    // Stop the MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop the microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Clear the recording timer
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    setRecordingState("processing");
    setTranscription(liveTranscript);
    
    // In a real app, you would send audioChunksRef.current to your transcription service
    // For now, we'll continue with the demo simulation
    
    // Define processing steps
    const steps: ProcessingStep[] = [
      { id: "transcribe", label: t('processingSteps.transcribe'), icon: <Volume2 className="w-4 h-4" />, completed: false },
      { id: "clean", label: t('processingSteps.clean'), icon: <Sparkles className="w-4 h-4" />, completed: false },
      { id: "structure", label: t('processingSteps.structure'), icon: <Brain className="w-4 h-4" />, completed: false },
      { id: "seo", label: t('processingSteps.seo'), icon: <Search className="w-4 h-4" />, completed: false },
      { id: "format", label: t('processingSteps.format'), icon: <FileText className="w-4 h-4" />, completed: false },
      { id: "generate", label: t('processingSteps.generate'), icon: <Zap className="w-4 h-4" />, completed: false },
      { id: "image", label: t('processingSteps.image'), icon: <Image className="w-4 h-4" />, completed: false },
    ];
    
    setProcessingSteps(steps);
    
    // Complete steps one by one
    steps.forEach((step, index) => {
      setTimeout(() => {
        setProcessingSteps(prev => 
          prev.map(s => s.id === step.id ? { ...s, completed: true } : s)
        );
        
        // When all steps are done
        if (index === steps.length - 1) {
          setTimeout(() => {
            setBlogContent(t('demo.blogContent'));
            setRecordingState("complete");
          }, 500);
        }
      }, (index + 1) * 800);
    });
  };

  const handleReset = () => {
    // Clean up any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    setRecordingState("idle");
    setTranscription("");
    setLiveTranscript("");
    setBlogContent("");
    setProcessingSteps([]);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audioChunksRef.current = [];
  };

  const showToast = (message: string) => {
    setToast({message, visible: true});
    setTimeout(() => setToast({message: "", visible: false}), 3000);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
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
    showToast(t('toast.signInToSave'));
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

  const getMicButtonContent = () => {
    switch (recordingState) {
      case "idle":
        return <Mic className="w-24 h-24" />;
      case "recording":
        return <Circle className="w-24 h-24 text-red-500 fill-current animate-pulse" />;
      case "processing":
        return <div className="w-24 h-24 border-8 border-current border-t-transparent rounded-full animate-spin" />;
      case "complete":
        return <Mic className="w-24 h-24" />;
    }
  };

  const getStatusText = () => {
    switch (recordingState) {
      case "idle":
        return t('recorder.idle');
      case "recording":
        return t('recorder.recording');
      case "processing":
        return t('recorder.processing');
      case "complete":
        return t('recorder.done');
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Free plan: 5 minutes (300 seconds)
  const getTimeLimit = () => {
    // In a real app, this would be based on user's subscription
    return 300; // 5 minutes for free plan
  };

  const isNearTimeLimit = () => {
    const limit = getTimeLimit();
    return recordingTime >= limit - 30; // Warning 30 seconds before limit
  };

  const hasReachedTimeLimit = () => {
    return recordingTime >= getTimeLimit();
  };

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
      if (transcriptInterval.current) {
        clearInterval(transcriptInterval.current);
      }
      if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-12">
        <button
          onClick={recordingState === "recording" ? handleStopRecording : recordingState === "complete" ? handleReset : handleStartRecording}
          disabled={recordingState === "processing"}
          className={[
            "mic",
            recordingState === "recording" ? "is-recording" : "",
            "w-40 h-40 sm:w-48 sm:h-48 rounded-full",
            "bg-gradient-electric text-primary-foreground",
            "transition-electric flex items-center justify-center",
            "hover:shadow-[0_20px_40px_rgba(97,144,255,0.3)]",
            "disabled:opacity-70 disabled:cursor-not-allowed",
            recordingState === "complete" ? "!bg-secondary !text-secondary-foreground shadow-elevated" : ""
          ].join(" ")}
        >
          {getMicButtonContent()}
        </button>
        
        <div className="text-center mt-6">
          <p className="text-muted-foreground text-lg mb-2">
            {getStatusText()}
          </p>
          {recordingState === "recording" && (
            <div className="flex flex-col items-center space-y-2">
              <div className={`text-2xl font-mono font-bold transition-colors ${
                isNearTimeLimit() ? 'text-red-500' : 'text-foreground'
              }`}>
                {formatTime(recordingTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                Free plan: {formatTime(getTimeLimit())} max
                {isNearTimeLimit() && !hasReachedTimeLimit() && (
                  <span className="text-red-500 ml-2">⚠️ {Math.floor((getTimeLimit() - recordingTime))}s remaining</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time audio visualization */}
      {recordingState === "recording" && (
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-24 sm:h-32 mb-8 px-6 sm:px-12 py-4 sm:py-6 bg-card/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-border/10">
          {levelsRef.current.map((lvl, i) => {
            // Natural equalizer - each bar responds to its own frequency range
            const heightPercent = Math.max(8, lvl * 100);
            const delay = i * 30; // Slight delay for wave effect
            
            return (
              <div
                key={i}
                className="transition-all duration-100 ease-out"
                style={{
                  height: `${heightPercent}%`,
                  width: window.innerWidth < 640 ? "6px" : "9px", // Smaller bars on mobile
                  backgroundColor: `hsl(${190 + i * 1.5}, 80%, ${55 + lvl * 25}%)`,
                  // Turn white/metallic when maxed (last 3 bars)
                  ...(lvl > 0.95 && i >= bars - 3 ? {
                    backgroundColor: `hsl(0, 0%, ${85 + lvl * 15}%)`,
                  } : {}),
                  borderRadius: "2.5px",
                  boxShadow: `0 0 ${lvl * (window.innerWidth < 640 ? 8 : 12)}px ${(lvl > 0.95 && i >= bars - 3) ? `hsl(0, 0%, ${85 + lvl * 15}%)` : `hsl(${190 + i * 1.5}, 80%, ${55 + lvl * 25}%)`}`,
                  opacity: 0.8 + (lvl * 0.2),
                  transform: `scaleY(${0.4 + lvl * 0.6}) scaleX(${0.8 + lvl * 0.2})`,
                  filter: `blur(${(1 - lvl) * 0.3}px)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Live transcript */}
      {recordingState === "recording" && liveTranscript && (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8">
          <p className="text-lg leading-relaxed typing-cursor">
            {liveTranscript}
          </p>
        </div>
      )}

      {/* Processing steps */}
      {recordingState === "processing" && (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {t('recorder.processingHeader')}
          </h3>
          <div className="space-y-3">
            {processingSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  step.completed 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-muted/50 text-muted-foreground"
                }`}>
                  {step.completed ? <Check className="w-4 h-4" /> : step.icon}
                </div>
                <span className={`transition-colors ${
                  step.completed ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Audio Player */}
      {audioBlob && recordingState === "complete" && (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Your Recording
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
            <div className="flex items-center justify-center gap-1.5 h-16 mt-6 px-8 py-4 bg-card/10 backdrop-blur-sm rounded-2xl border border-border/5">
              {playbackLevels.map((lvl, i) => {
                const heightPercent = Math.max(6, lvl * 100);
                
                return (
                  <div
                    key={i}
                    className="transition-all duration-100 ease-out"
                    style={{
                      height: `${heightPercent}%`,
                      width: "6px",
                      backgroundColor: `hsl(${200 + i * 2}, 70%, ${60 + lvl * 20}%)`,
                      borderRadius: "3px",
                      boxShadow: `0 0 ${lvl * 8}px hsl(${200 + i * 2}, 70%, ${60 + lvl * 20}%)`,
                      opacity: 0.7 + (lvl * 0.3),
                      transform: `scaleY(${0.5 + lvl * 0.5})`,
                    }}
                  />
                );
              })}
            </div>
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
          {transcription && (
            <div className="bg-card rounded-2xl border border-border/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('recorder.originalTranscription')}</h3>
                <button
                  onClick={() => handleCopy(transcription)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {t('actions.copy')}
                </button>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {transcription}
              </p>
            </div>
          )}

          {blogContent && (
            <div className="bg-card rounded-2xl border border-border/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  {t('recorder.polishedVibelog')}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(blogContent)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {t('actions.copy')}
                  </button>
                  <button 
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {t('actions.save')}
                  </button>
                  <button 
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    <Share className="w-4 h-4" />
                    {t('actions.share')}
                  </button>
                </div>
              </div>
              <div className="prose prose-lg max-w-none text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>ul]:text-muted-foreground [&>strong]:text-foreground">
                <div className="whitespace-pre-wrap">
                  {blogContent}
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-electric text-primary-foreground rounded-xl hover:shadow-[0_10px_20px_rgba(97,144,255,0.3)] transition-all duration-300"
            >
              <Mic className="w-4 h-4" />
              {t('actions.recordNew')}
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 shadow-lg animate-[slideUp_0.3s_ease-out]">
            <p className="text-sm font-medium text-foreground">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%) translateX(-50%);
            opacity: 0;
          }
          to {
            transform: translateY(0) translateX(-50%);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
