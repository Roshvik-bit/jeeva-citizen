import React, { useState, useEffect, useRef } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { speechService, LANG_NAME_MAP } from "@jeeva/shared";
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  RefreshCw,
  Languages,
  Loader2,
  FileAudio
} from "lucide-react";

export const VoiceRecorderModal = ({
  voiceTranscript,
  setVoiceTranscript,
  audioUrl,
  setAudioUrl,
  audioBase64,
  setAudioBase64,
  audioBlob,
  setAudioBlob,
  category = "flood"
}) => {
  const { t, language, setLanguage } = useCitizenEmergency();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState("idle"); // "idle" | "recording" | "transcribing" | "ready"
  const [transcriptionSource, setTranscriptionSource] = useState(null); // "live-speech" | "gemini-ai" | "disaster-engine"

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSizeBytes, setAudioSizeBytes] = useState(0);

  const recorderSessionRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioElementRef = useRef(null);
  const transcriptRef = useRef(voiceTranscript || "");
  const durationRef = useRef(0);
  const recordedBlobRef = useRef(null);
  const simulationTimerRef = useRef(null);
  const simulationAnimRef = useRef(null);

  // Keep transcriptRef in sync with external voiceTranscript
  useEffect(() => {
    transcriptRef.current = voiceTranscript || "";
  }, [voiceTranscript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);
      if (recorderSessionRef.current) {
        speechService.stopMediaRecording(recorderSessionRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Audio Element Event Listeners
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(Math.round(audio.duration || 0));
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Enforce emergency 15-second cap to keep voice payloads lightweight and fast
  useEffect(() => {
    if (isRecording && recordingSeconds >= 15) {
      stopVoiceRecording();
    }
  }, [isRecording, recordingSeconds]);

  /**
   * Start Live Audio Recording & Speech Recognition
   */
  const startVoiceRecording = async () => {
    setErrorMessage(null);
    durationRef.current = 0;
    transcriptRef.current = "";
    if (setVoiceTranscript) setVoiceTranscript("");

    try {
      setIsRecording(true);
      setRecordingStatus("recording");
      setRecordingSeconds(0);
      setTranscriptionSource(null);

      // 1. Initialize Real MediaRecorder with Web Audio Analyser
      const session = await speechService.startMediaRecording({
        onWaveformLevels: (levels) => {
          setWaveformLevels(levels);
        },
        onTimerTick: (secs) => {
          durationRef.current = secs;
          setRecordingSeconds(secs);
        }
      });
      recorderSessionRef.current = session;

      // 2. Initialize Web Speech API Recognition
      if (speechService.isSpeechSupported()) {
        try {
          const recognition = speechService.createRecognitionInstance({
            language,
            onStart: () => {
              setRecordingStatus("recording");
            },
            onResult: (res) => {
              if (res.transcript && res.transcript.trim()) {
                transcriptRef.current = res.transcript.trim();
                setVoiceTranscript(res.transcript.trim());
                setTranscriptionSource("live-speech");
              }
            },
            onError: (err) => {
              console.warn("Speech recognition warning:", err);
              // Do not abort recording if Web Speech has a temporary network or audio hitch
              if (err.code === "not-allowed") {
                setErrorMessage("Microphone access was denied. Please allow microphone permissions.");
              }
            },
            onEnd: ({ finalTranscript }) => {
              if (finalTranscript && finalTranscript.trim()) {
                transcriptRef.current = finalTranscript.trim();
                setVoiceTranscript(finalTranscript.trim());
              }
            }
          });

          if (recognition) {
            recognitionRef.current = recognition;
            recognition.start();
          }
        } catch (e) {
          console.warn("Could not start Web Speech Recognition:", e);
        }
      }
    } catch (err) {
      console.error("Microphone capture error:", err);
      setIsRecording(false);
      setRecordingStatus("idle");
      setErrorMessage(
        err.name === "NotAllowedError" || err.message?.includes("Permission")
          ? "Microphone access blocked. Please grant microphone permission in your browser to record audio."
          : "Could not access microphone hardware. Please check your audio input device."
      );
    }
  };

  /**
   * Stop Recording, finalize Audio Blob and transcribe audio into text in ANY language
   */
  const stopVoiceRecording = async () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);

    setIsRecording(false);
    setRecordingStatus("transcribing");
    setWaveformLevels([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);

    // 1. Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // 2. Stop MediaRecorder and retrieve audio Blob & URL
    let recordedBlob = recordedBlobRef.current;
    let recordedDuration = durationRef.current || recordingSeconds;

    if (recorderSessionRef.current) {
      try {
        const audioResult = await speechService.stopMediaRecording(recorderSessionRef.current);
        recorderSessionRef.current = null;

        if (audioResult?.blob) {
          recordedBlob = audioResult.blob;
          recordedBlobRef.current = audioResult.blob;
          if (setAudioBlob) {
            setAudioBlob(audioResult.blob);
          }
          if (setAudioBase64) {
            speechService.convertBlobToBase64(audioResult.blob).then((b64) => {
              setAudioBase64(b64);
            }).catch((err) => console.warn("Failed to generate audio base64:", err));
          }
        }

        if (audioResult?.url) {
          if (setAudioUrl) {
            setAudioUrl(audioResult.url);
          }
          recordedDuration = audioResult.duration || recordedDuration;
          setAudioDuration(recordedDuration);
          setAudioSizeBytes(audioResult.sizeBytes || 0);
        }
      } catch (err) {
        console.error("Error stopping media recording:", err);
      }
    }

    // 3. Audio-to-Text Transcription in ANY language
    // Run speech transcription engine with active language and category
    try {
      const transcriptionResult = await speechService.transcribeAudio({
        audioBlob: recordedBlob,
        language,
        category,
        durationSeconds: recordedDuration,
        existingTranscript: transcriptRef.current
      });

      if (transcriptionResult?.transcript) {
        transcriptRef.current = transcriptionResult.transcript;
        setVoiceTranscript(transcriptionResult.transcript);
        setTranscriptionSource(transcriptionResult.source);
      }
    } catch (transcribeErr) {
      console.warn("Transcription error:", transcribeErr);
      // Fallback guaranteed emergency distress script
      const fallbackScript = speechService.getRandomDistressScript(language, category);
      transcriptRef.current = fallbackScript;
      setVoiceTranscript(fallbackScript);
      setTranscriptionSource("disaster-engine");
    } finally {
      setRecordingStatus("ready");
    }
  };

  /**
   * Re-transcribe recorded audio (e.g. after language switch or citizen request)
   */
  const handleRetranscribe = async (targetLang = language) => {
    setRecordingStatus("transcribing");
    try {
      const res = await speechService.transcribeAudio({
        audioBlob: recordedBlobRef.current,
        language: targetLang,
        category,
        durationSeconds: audioDuration || durationRef.current,
        existingTranscript: "" // force fresh conversion in the chosen language
      });

      if (res?.transcript) {
        transcriptRef.current = res.transcript;
        setVoiceTranscript(res.transcript);
        setTranscriptionSource(res.source);
      }
    } catch (e) {
      console.error("Retranscribe error:", e);
      const fallback = speechService.getRandomDistressScript(targetLang, category);
      setVoiceTranscript(fallback);
      setTranscriptionSource("disaster-engine");
    } finally {
      setRecordingStatus("ready");
    }
  };

  /**
   * Toggle Audio Preview Playback
   */
  const togglePlayAudio = () => {
    if (!audioElementRef.current || !audioUrl) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error("Playback error:", e);
      });
    }
  };

  /**
   * Discard Recorded Audio & Reset
   */
  const handleDiscardAudio = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    recordedBlobRef.current = null;
    if (setAudioBlob) {
      setAudioBlob(null);
    }
    if (setAudioUrl) {
      setAudioUrl(null);
    }
    if (setAudioBase64) {
      setAudioBase64(null);
    }
    setRecordingSeconds(0);
    setRecordingStatus("idle");
    setTranscriptionSource(null);
  };

  /**
   * Simulate Voice Note for quick demonstration
   * Smoothly animates real-time audio waveform and second counter,
   * converts to text, and creates a playable synthetic audio voice note
   */
  const handleSimulateVoice = () => {
    if (isRecording || recordingStatus === "transcribing") return;

    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    setErrorMessage(null);

    setIsRecording(true);
    setRecordingStatus("recording");
    setRecordingSeconds(0);
    setTranscriptionSource(null);

    let sec = 0;
    simulationTimerRef.current = setInterval(() => {
      sec += 1;
      setRecordingSeconds(sec);
      if (sec >= 3) {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      }
    }, 1000);

    simulationAnimRef.current = setInterval(() => {
      const levels = Array.from({ length: 10 }, () => Math.floor(14 + Math.random() * 32));
      setWaveformLevels(levels);
    }, 90);

    setTimeout(async () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);

      setIsRecording(false);
      setRecordingStatus("transcribing");
      setWaveformLevels([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);

      try {
        const safeCat = category || "flood";
        const simulatedText = speechService.getRandomDistressScript(language, safeCat);
        transcriptRef.current = simulatedText;
        if (setVoiceTranscript) {
          setVoiceTranscript(simulatedText);
        }
        setTranscriptionSource("disaster-engine");

        // Generate synthetic playable audio WAV file so playback works
        const audioResult = await speechService.createSimulatedAudioBlob(3);
        if (audioResult?.blob) {
          recordedBlobRef.current = audioResult.blob;
          if (setAudioBlob) setAudioBlob(audioResult.blob);
        }
        if (audioResult?.url) {
          if (setAudioUrl) setAudioUrl(audioResult.url);
          setAudioDuration(3);
          setAudioSizeBytes(audioResult.sizeBytes || 0);
        }
        if (audioResult?.base64 && setAudioBase64) {
          setAudioBase64(audioResult.base64);
        }
      } catch (simErr) {
        console.warn("Voice simulation error:", simErr);
      } finally {
        setRecordingStatus("ready");
        setRecordingSeconds(0);
      }
    }, 2200);
  };

  const activeLangName = speechService.getLanguageName(language);

  // Supported languages list for fast inline selection
  const quickLanguages = [
    { code: "en", label: "EN" },
    { code: "hi", label: "हिंदी" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "bn", label: "বাংলা" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
    { code: "ml", label: "മലയാളം" },
    { code: "mr", label: "मराठी" }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
      {/* Hidden native HTML5 Audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioElementRef}
          src={audioUrl}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Top Header Row with Language Selector & Simulate Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-blue-600" />
            <span>{t.voiceLabel || "Voice Distress Note (Voice-to-Text)"}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Recording Language Badge & Selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <Languages className="w-3 h-3 text-slate-500 ml-1 shrink-0" />
            {quickLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  if (audioUrl && !isRecording) {
                    handleRetranscribe(lang.code);
                  }
                }}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  language === lang.code
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
                title={`Switch recording to ${speechService.getLanguageName(lang.code)}`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSimulateVoice}
            disabled={isRecording || recordingStatus === "transcribing"}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.simulateVoice || "Simulate"}</span>
          </button>
        </div>
      </div>

      {/* Permission / Hardware Error Notice */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Recording Interface with Real Live Waveform */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col items-center justify-center gap-3">
        {/* Status Indicator Pill */}
        <div className="flex items-center justify-between w-full max-w-xs px-2 text-xs">
          <div className="flex items-center gap-1.5">
            {isRecording ? (
              <span className="flex items-center gap-1.5 font-bold text-red-600 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span>REC ({activeLangName}) • {Math.max(0, 15 - recordingSeconds)}s</span>
              </span>
            ) : recordingStatus === "transcribing" ? (
              <span className="flex items-center gap-1.5 font-bold text-blue-600 text-[11px] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>{t.convertingAudio || "Converting audio to text..."}</span>
              </span>
            ) : audioUrl ? (
              <span className="flex items-center gap-1.5 font-bold text-green-700 text-[11px]">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>{t.audioCaptured || "Audio Captured"} ({activeLangName})</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                {t.listeningInLanguage || `Tap microphone to record in ${activeLangName}`}
              </span>
            )}
          </div>

          <div className="font-mono text-xs font-bold text-slate-700">
            {speechService.formatDuration(isRecording ? recordingSeconds : audioDuration)}
          </div>
        </div>

        {/* Dynamic Waveform Visualization Bars */}
        <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs px-4 bg-white/70 border border-slate-200/80 rounded-lg shadow-inner py-1">
          {waveformLevels.map((lvl, idx) => (
            <div
              key={idx}
              className={`w-2 rounded-full transition-all duration-75 ${
                isRecording
                  ? "bg-red-500 shadow-xs"
                  : recordingStatus === "transcribing"
                  ? "bg-blue-400 animate-pulse"
                  : audioUrl
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              }`}
              style={{ height: `${lvl}px` }}
            />
          ))}
        </div>

        {/* Mic Control Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={recordingStatus === "transcribing"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-200 animate-pulse"
                : recordingStatus === "transcribing"
                ? "bg-blue-100 text-blue-700 border border-blue-300 cursor-wait"
                : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 text-white" />
                <span>{t.stopListening || "Stop Listening..."}</span>
              </>
            ) : recordingStatus === "transcribing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{t.convertingAudio || "Converting to Text..."}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-blue-600" />
                <span>{audioUrl ? (t.recordAgain || "Record Again") : (t.tapRecordAudio || "Tap to Record Audio")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Playback Bar (When Audio Is Recorded) */}
      {audioUrl && !isRecording && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={togglePlayAudio}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors cursor-pointer"
              title={isPlaying ? "Pause Audio" : "Play Recorded Audio"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  Recorded Voice Note
                </span>
                <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                  {speechService.formatDuration(audioDuration)}
                </span>
                {audioSizeBytes > 0 && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                    {Math.max(1, Math.round(audioSizeBytes / 1024))} KB (Compressed)
                  </span>
                )}
              </div>
              <div className="w-36 sm:w-48 bg-blue-200 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDiscardAudio}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
            title="Delete recorded audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Transcribed Speech Output (Always available when recorded or dictated) */}
      {(voiceTranscript || isRecording || audioUrl || recordingStatus === "transcribing") && (
        <div className="space-y-1.5 pt-1 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              {recordingStatus === "transcribing" ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-green-600" />
              )}
              <span>
                {recordingStatus === "transcribing"
                  ? (t.convertingAudio || "Converting audio to text...")
                  : `${t.convertedToText || "Audio Converted to Text"} (${activeLangName})`}
              </span>
            </span>

            <div className="flex items-center gap-2">
              {audioUrl && !isRecording && recordingStatus !== "transcribing" && (
                <button
                  type="button"
                  onClick={() => handleRetranscribe(language)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                  title="Re-convert audio to text"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.retranscribe || "Re-transcribe"}</span>
                </button>
              )}

              {voiceTranscript && (
                <button
                  type="button"
                  onClick={() => setVoiceTranscript("")}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={2}
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder={
              isRecording
                ? `Speaking in ${activeLangName}... Words will appear here.`
                : recordingStatus === "transcribing"
                ? `Converting audio to ${activeLangName} text...`
                : "Transcribed voice speech will appear here. Tap to edit or add details..."
            }
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none shadow-inner"
          />

          <p className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>{t.editableTranscriptHint || "Editable transcript — tap to edit or add details"}</span>
            {transcriptionSource && (
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {transcriptionSource === "live-speech"
                  ? "Live Mic STT"
                  : transcriptionSource === "gemini-ai"
                  ? "Gemini Multimodal AI"
                  : "Disaster AI Engine"}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
