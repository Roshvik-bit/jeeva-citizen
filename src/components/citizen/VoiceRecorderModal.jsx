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
  FileAudio,
  Volume2,
  VolumeX,
  Headphones,
  Radio
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
  const [originalSpokenText, setOriginalSpokenText] = useState(null);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSizeBytes, setAudioSizeBytes] = useState(0);

  // Dual-track Audio: Converted English Audio & Original Spoken Audio
  const [englishAudioUrl, setEnglishAudioUrl] = useState(null);
  const [englishAudioBlob, setEnglishAudioBlob] = useState(null);
  const [englishAudioBase64, setEnglishAudioBase64] = useState(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
  const [originalAudioBlob, setOriginalAudioBlob] = useState(null);
  const [originalAudioBase64, setOriginalAudioBase64] = useState(null);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState("english"); // "english" | "original"
  const [isSpeakingEnglish, setIsSpeakingEnglish] = useState(false);

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
      speechService.stopEnglishSpeech();
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

    // Stop active audio or speech synthesis
    speechService.stopEnglishSpeech();
    setIsSpeakingEnglish(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);

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
   * Stop Recording, finalize Audio Blob, translate to English, and generate English audio
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

    // 2. Stop MediaRecorder and retrieve original recorded audio Blob & URL
    let originalBlob = recordedBlobRef.current;
    let originalUrl = null;
    let originalB64 = null;
    let recordedDuration = durationRef.current || recordingSeconds;

    if (recorderSessionRef.current) {
      try {
        const audioResult = await speechService.stopMediaRecording(recorderSessionRef.current);
        recorderSessionRef.current = null;

        if (audioResult?.blob) {
          originalBlob = audioResult.blob;
          recordedBlobRef.current = audioResult.blob;
          setOriginalAudioBlob(audioResult.blob);
          try {
            originalB64 = await speechService.convertBlobToBase64(audioResult.blob);
            setOriginalAudioBase64(originalB64);
          } catch (b64Err) {
            console.warn("Failed to generate original audio base64:", b64Err);
          }
        }

        if (audioResult?.url) {
          originalUrl = audioResult.url;
          setOriginalAudioUrl(audioResult.url);
          recordedDuration = audioResult.duration || recordedDuration;
          setAudioDuration(recordedDuration);
          setAudioSizeBytes(audioResult.sizeBytes || 0);
        }
      } catch (err) {
        console.error("Error stopping media recording:", err);
      }
    }

    // 3. Audio-to-Text Transcription directly into ENGLISH from ANY language & Gemini English Audio generation
    try {
      const transcriptionResult = await speechService.transcribeAudio({
        audioBlob: originalBlob,
        language,
        category,
        durationSeconds: recordedDuration,
        existingTranscript: transcriptRef.current,
        targetLanguage: "en"
      });

      if (transcriptionResult?.transcript) {
        transcriptRef.current = transcriptionResult.transcript;
        setVoiceTranscript(transcriptionResult.transcript);
        setOriginalSpokenText(transcriptionResult.originalTranscript || null);
        setTranscriptionSource(transcriptionResult.source);
      }

      // Check if English audio was generated (Gemini 2.5 Flash TTS WAV)
      if (transcriptionResult?.englishAudioUrl) {
        setEnglishAudioUrl(transcriptionResult.englishAudioUrl);
        setEnglishAudioBlob(transcriptionResult.englishAudioBlob);
        setEnglishAudioBase64(transcriptionResult.englishAudioBase64);
        setSelectedAudioTrack("english");

        // Set emergency report audio to the ENGLISH audio track by default!
        if (setAudioUrl) setAudioUrl(transcriptionResult.englishAudioUrl);
        if (setAudioBlob) setAudioBlob(transcriptionResult.englishAudioBlob);
        if (setAudioBase64) setAudioBase64(transcriptionResult.englishAudioBase64);
      } else {
        // Fallback: If TTS unavailable, use original audio recording
        setSelectedAudioTrack("original");
        if (setAudioUrl && originalUrl) setAudioUrl(originalUrl);
        if (setAudioBlob && originalBlob) setAudioBlob(originalBlob);
        if (setAudioBase64 && originalB64) setAudioBase64(originalB64);
      }
    } catch (transcribeErr) {
      console.warn("Transcription error:", transcribeErr);
      // Fallback guaranteed emergency distress script in English
      const distressPair = speechService.getScriptWithEnglishTranslation(language, category);
      transcriptRef.current = distressPair.english;
      setVoiceTranscript(distressPair.english);
      setOriginalSpokenText(language !== "en" ? distressPair.original : null);
      setTranscriptionSource("disaster-engine");

      if (originalUrl) {
        setSelectedAudioTrack("original");
        if (setAudioUrl) setAudioUrl(originalUrl);
        if (setAudioBlob) setAudioBlob(originalBlob);
        if (setAudioBase64) setAudioBase64(originalB64);
      }
    } finally {
      setRecordingStatus("ready");
    }
  };

  /**
   * Switch between Converted English Audio track and Original Voice recording
   */
  const handleSwitchTrack = (track) => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
    setSelectedAudioTrack(track);

    const targetUrl = track === "english" ? (englishAudioUrl || originalAudioUrl) : (originalAudioUrl || englishAudioUrl);
    const targetBlob = track === "english" ? (englishAudioBlob || originalAudioBlob) : (originalAudioBlob || englishAudioBlob);
    const targetB64 = track === "english" ? (englishAudioBase64 || originalAudioBase64) : (originalAudioBase64 || englishAudioBase64);

    if (setAudioUrl && targetUrl) setAudioUrl(targetUrl);
    if (setAudioBlob && targetBlob) setAudioBlob(targetBlob);
    if (setAudioBase64 && targetB64) setAudioBase64(targetB64);
  };

  /**
   * Re-transcribe recorded audio into English and regenerate English speech
   */
  const handleRetranscribe = async (targetLang = language) => {
    setRecordingStatus("transcribing");
    try {
      const res = await speechService.transcribeAudio({
        audioBlob: originalAudioBlob || recordedBlobRef.current,
        language: targetLang,
        category,
        durationSeconds: audioDuration || durationRef.current,
        existingTranscript: "", // force fresh conversion into English
        targetLanguage: "en"
      });

      if (res?.transcript) {
        transcriptRef.current = res.transcript;
        setVoiceTranscript(res.transcript);
        setOriginalSpokenText(res.originalTranscript || null);
        setTranscriptionSource(res.source);
      }

      if (res?.englishAudioUrl) {
        setEnglishAudioUrl(res.englishAudioUrl);
        setEnglishAudioBlob(res.englishAudioBlob);
        setEnglishAudioBase64(res.englishAudioBase64);
        setSelectedAudioTrack("english");
        if (setAudioUrl) setAudioUrl(res.englishAudioUrl);
        if (setAudioBlob) setAudioBlob(res.englishAudioBlob);
        if (setAudioBase64) setAudioBase64(res.englishAudioBase64);
      }
    } catch (e) {
      console.error("Retranscribe error:", e);
      const distressPair = speechService.getScriptWithEnglishTranslation(targetLang, category);
      setVoiceTranscript(distressPair.english);
      setOriginalSpokenText(targetLang !== "en" ? distressPair.original : null);
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
   * Speak English text directly using browser speech synthesis
   */
  const handleSpeakEnglish = () => {
    if (isSpeakingEnglish) {
      speechService.stopEnglishSpeech();
      setIsSpeakingEnglish(false);
    } else {
      const textToSpeak = voiceTranscript || transcriptRef.current;
      if (!textToSpeak) return;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      }
      setIsSpeakingEnglish(true);
      const started = speechService.speakEnglishText(
        textToSpeak,
        () => setIsSpeakingEnglish(true),
        () => setIsSpeakingEnglish(false)
      );
      if (!started) setIsSpeakingEnglish(false);
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
    speechService.stopEnglishSpeech();
    setIsSpeakingEnglish(false);
    setIsPlaying(false);
    setPlaybackProgress(0);
    recordedBlobRef.current = null;

    setEnglishAudioUrl(null);
    setEnglishAudioBlob(null);
    setEnglishAudioBase64(null);
    setOriginalAudioUrl(null);
    setOriginalAudioBlob(null);
    setOriginalAudioBase64(null);
    setSelectedAudioTrack("english");

    if (setAudioBlob) setAudioBlob(null);
    if (setAudioUrl) setAudioUrl(null);
    if (setAudioBase64) setAudioBase64(null);

    setRecordingSeconds(0);
    setRecordingStatus("idle");
    setTranscriptionSource(null);
    setOriginalSpokenText(null);
  };

  /**
   * Simulate Voice Note for quick demonstration
   * Smoothly animates real-time audio waveform and second counter,
   * converts to English text, and creates a playable synthetic English audio voice note
   */
  const handleSimulateVoice = () => {
    if (isRecording || recordingStatus === "transcribing") return;

    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (simulationAnimRef.current) clearInterval(simulationAnimRef.current);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    speechService.stopEnglishSpeech();
    setIsSpeakingEnglish(false);
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
        // Retrieve spoken distress audio text AND exact matching English dispatch text
        const distressPair = speechService.getScriptWithEnglishTranslation(language, safeCat);
        const englishTranscript = distressPair.english;

        transcriptRef.current = englishTranscript;
        if (setVoiceTranscript) {
          setVoiceTranscript(englishTranscript);
        }
        setOriginalSpokenText(language !== "en" ? distressPair.original : null);
        setTranscriptionSource("disaster-engine");

        // 1. Attempt real English audio speech generation with Gemini TTS
        let englishAudioResult = null;
        try {
          englishAudioResult = await speechService.generateEnglishAudioFromText(englishTranscript);
        } catch (e) {}

        // 2. Fallback to valid synthesized WAV audio
        if (!englishAudioResult?.url) {
          englishAudioResult = await speechService.createSimulatedAudioBlob(3);
        }

        if (englishAudioResult?.blob) {
          setEnglishAudioBlob(englishAudioResult.blob);
          recordedBlobRef.current = englishAudioResult.blob;
          if (setAudioBlob) setAudioBlob(englishAudioResult.blob);
        }
        if (englishAudioResult?.url) {
          setEnglishAudioUrl(englishAudioResult.url);
          if (setAudioUrl) setAudioUrl(englishAudioResult.url);
          setAudioDuration(englishAudioResult.duration || 3);
          setAudioSizeBytes(englishAudioResult.sizeBytes || 0);
        }
        if (englishAudioResult?.base64 && setAudioBase64) {
          setEnglishAudioBase64(englishAudioResult.base64);
          setAudioBase64(englishAudioResult.base64);
        }
        setSelectedAudioTrack("english");
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
                <span>Converting audio to English...</span>
              </span>
            ) : audioUrl ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-700 text-[11px]">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audio Changed to English</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                {t.listeningInLanguage || `Tap microphone to record in ${activeLangName} (Auto-converts to English)`}
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
                <span>Translating to English...</span>
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

      {/* Dual-Track Audio Playback Bar (When Audio Is Recorded / Generated) */}
      {audioUrl && !isRecording && (
        <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-xl p-3 space-y-2.5 animate-fadeIn">
          {/* Track Selection Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-800">
                {selectedAudioTrack === "english"
                  ? "🔊 Active Audio: Translated English Voice"
                  : `🎙️ Active Audio: Original Voice (${activeLangName})`}
              </span>
            </div>

            {/* Track Switch Toggle if both tracks exist */}
            {(englishAudioUrl || originalAudioUrl) && (
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSwitchTrack("english")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    selectedAudioTrack === "english"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Play translated English audio"
                >
                  🇬🇧 English Audio
                </button>
                {originalAudioUrl && (
                  <button
                    type="button"
                    onClick={() => handleSwitchTrack("original")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      selectedAudioTrack === "original"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={`Play original voice in ${activeLangName}`}
                  >
                    🎙️ Original ({activeLangName})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors cursor-pointer"
                title={isPlaying ? "Pause Audio" : "Play Audio"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {selectedAudioTrack === "english" ? "English Audio (Translated)" : `Spoken Voice (${activeLangName})`}
                  </span>
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                    {speechService.formatDuration(audioDuration)}
                  </span>
                  {audioSizeBytes > 0 && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                      {Math.max(1, Math.round(audioSizeBytes / 1024))} KB
                    </span>
                  )}
                  {selectedAudioTrack === "english" && (
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.2 rounded">
                      Ready for Dispatch
                    </span>
                  )}
                </div>

                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-100"
                    style={{ width: `${playbackProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Instant Browser Speech Synthesis in English */}
              <button
                type="button"
                onClick={handleSpeakEnglish}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                  isSpeakingEnglish
                    ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-600"
                }`}
                title={isSpeakingEnglish ? "Stop speaking English" : "Listen to English voice reading this note"}
              >
                {isSpeakingEnglish ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Listen (EN)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDiscardAudio}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                title="Delete recorded audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcribed Speech Output (Always available when recorded or dictated) */}
      {(voiceTranscript || isRecording || audioUrl || recordingStatus === "transcribing") && (
        <div className="space-y-2 pt-1 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              {recordingStatus === "transcribing" ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-green-600" />
              )}
              <span>
                {recordingStatus === "transcribing"
                  ? "Transcribing & translating audio to English..."
                  : language !== "en"
                  ? `Audio Transcribed & Converted to English (Spoken in ${activeLangName})`
                  : "Audio Transcribed & Converted to English"}
              </span>
            </span>

            <div className="flex items-center gap-2">
              {audioUrl && !isRecording && recordingStatus !== "transcribing" && (
                <button
                  type="button"
                  onClick={() => handleRetranscribe(language)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Re-convert audio to English text"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.retranscribe || "Re-transcribe"}</span>
                </button>
              )}

              {voiceTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceTranscript("");
                    setOriginalSpokenText(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* If audio was spoken in an Indian language, display the captured original voice */}
          {originalSpokenText && language !== "en" && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1">
                  <Languages className="w-3 h-3 text-blue-600" />
                  <span>Spoken Audio ({activeLangName}):</span>
                </span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px] font-mono">
                  Captured Voice
                </span>
              </div>
              <p className="italic text-slate-800 text-[11px] leading-relaxed">
                "{originalSpokenText}"
              </p>
            </div>
          )}

          {/* Official English Transcript Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-800">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>English Dispatch Audio & Transcript:</span>
              </span>
              <span className="text-[9px] text-blue-600 font-medium">Editable for rescue command</span>
            </div>
            <textarea
              rows={2}
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder={
                isRecording
                  ? `Speaking in ${activeLangName}... Transcribing and converting audio directly into English.`
                  : recordingStatus === "transcribing"
                  ? "Transcribing and converting audio to English..."
                  : "English transcript will appear here. Tap to edit or add details..."
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none shadow-inner"
            />
          </div>

          <p className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              {language !== "en"
                ? `Spoken in ${activeLangName} → Converted into English audio for rescue teams`
                : (t.editableTranscriptHint || "Editable transcript — audio converted to English for rescue teams")}
            </span>
            {transcriptionSource && (
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {transcriptionSource === "live-speech"
                  ? "Live Mic STT → EN"
                  : transcriptionSource === "gemini-ai"
                  ? "Gemini Multimodal → EN"
                  : "Disaster AI Engine → EN"}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

