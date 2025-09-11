"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Circle, Copy, Share, Save, Check, Sparkles, Image, Search, FileText, Volume2, Brain, Zap } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

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
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [toast, setToast] = useState<{message: string; visible: boolean}>({message: "", visible: false});
  
  // Enhanced fluid bars
  const bars = 32;
  const raf = useRef<number | null>(null);
  const levelsRef = useRef<number[]>(Array.from({ length: bars }, () => 0.2));
  const [, force] = useState(0);
  const transcriptInterval = useRef<number | null>(null);

  // Fluid bars animation
  useEffect(() => {
    if (recordingState === "recording") {
      const loop = (t: number) => {
        const arr = levelsRef.current;
        for (let i = 0; i < arr.length; i++) {
          const base = 0.5 + 0.4 * Math.sin(t / 400 + i * 0.3);
          const noise = (Math.random() - 0.5) * 0.15;
          const target = Math.max(0.1, Math.min(1, base + noise));
          arr[i] += (target - arr[i]) * 0.25;
        }
        force((x) => x + 1);
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
    } else {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [recordingState]);

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

  const handleStartRecording = () => {
    setRecordingState("recording");
    setTranscription("");
    setBlogContent("");
    setProcessingSteps([]);
  };

  const handleStopRecording = () => {
    setRecordingState("processing");
    setTranscription(liveTranscript);
    
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
    setRecordingState("idle");
    setTranscription("");
    setLiveTranscript("");
    setBlogContent("");
    setProcessingSteps([]);
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

  const getMicButtonContent = () => {
    switch (recordingState) {
      case "idle":
        return <Mic className="w-12 h-12" />;
      case "recording":
        return <Circle className="w-12 h-12 text-red-500 fill-current animate-pulse" />;
      case "processing":
        return <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />;
      case "complete":
        return <Mic className="w-12 h-12" />;
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
        
        <p className="text-muted-foreground mt-6 text-lg">
          {getStatusText()}
        </p>
      </div>

      {/* Fluid bars visualization */}
      {recordingState === "recording" && (
        <div className="flex items-end justify-center gap-[2px] h-24 mb-8 bg-background/50 backdrop-blur-sm rounded-xl p-4">
          {levelsRef.current.map((lvl, i) => (
            <div
              key={i}
              style={{
                height: `${lvl * 100}%`,
                width: "4px",
                borderRadius: "2px",
                background: "linear-gradient(to top, #0ea5e9, #22d3ee, #60a5fa)",
                boxShadow: "0 0 6px rgba(34,211,238,0.6)",
              }}
            />
          ))}
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
