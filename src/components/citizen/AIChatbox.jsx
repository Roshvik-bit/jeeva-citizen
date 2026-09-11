import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import {
  geminiChatService,
  EMERGENCY_CATEGORIES,
  geoService,
  LANG_LOCALE_MAP
} from "@jeeva/shared";
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Waves,
  Users,
  HeartPulse,
  Flame,
  Building2,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Info,
  PhoneCall,
  Loader2,
  Languages
} from "lucide-react";

export const AIChatbox = ({ onOpenMyReports }) => {
  const { isOnline, submitDistressReport, addToast, playEmergencyAudio, language } = useCitizenEmergency();

  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(true);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [submittedIncident, setSubmittedIncident] = useState(null);

  // Active Draft Emergency Report extracted by Gemini
  const [draftReport, setDraftReport] = useState(null);

  // Conversation history
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content:
        "👋 **Hello! I am JEEVA's Gemini AI Emergency Assistant.**\n\nIf filling out the emergency form feels confusing or difficult, don't worry. Simply describe what is happening, where you are, or how many people need help. I will automatically prepare and submit your rescue report.",
      suggestions: [
        "🌊 Flood water entering house",
        "👥 Family trapped on roof",
        "🏥 Need urgent medical help",
        "📍 Share my GPS location"
      ]
    }
  ]);

  const messagesEndRef = useRef(null);
  const speechRecognizerRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnreadNotice(false);
    }
  }, [messages, isTyping, isOpen, scrollToBottom]);

  // Fetch initial GPS coordinates in background
  useEffect(() => {
    geoService.getCurrentCoordinates().then((coords) => {
      if (coords && coords.lat) {
        const address = geoService.getReadableAddress(coords.lat, coords.lng);
        setCurrentCoords({ ...coords, address });
      }
    }).catch(() => {});
  }, []);

  // Helper to map category to icon
  const getCategoryIcon = (catId) => {
    switch (catId) {
      case "flood":
        return <Waves className="w-4 h-4 text-blue-600" />;
      case "trapped":
        return <Users className="w-4 h-4 text-orange-600" />;
      case "medical":
        return <HeartPulse className="w-4 h-4 text-red-600" />;
      case "blocked_road":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "bridge":
        return <Building2 className="w-4 h-4 text-slate-600" />;
      case "fire":
        return <Flame className="w-4 h-4 text-red-500" />;
      case "earthquake":
        return <Activity className="w-4 h-4 text-amber-700" />;
      case "tsunami":
        return <Waves className="w-4 h-4 text-cyan-600" />;
      default:
        return <AlertOctagon className="w-4 h-4 text-purple-600" />;
    }
  };

  // Trigger browser speech recognition for mic input
  const handleToggleVoice = () => {
    if (isListeningVoice) {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (_) {}
      }
      setIsListeningVoice(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast({
        type: "warning",
        title: "Microphone Not Supported",
        message: "Your browser does not support live speech recognition. Please type your message."
      });
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = (language && LANG_LOCALE_MAP && LANG_LOCALE_MAP[language]) || navigator.language || "en-IN";

      recognizer.onstart = () => {
        setIsListeningVoice(true);
      };

      recognizer.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage(transcript);
      };

      recognizer.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsListeningVoice(false);
      };

      recognizer.onend = () => {
        setIsListeningVoice(false);
      };

      speechRecognizerRef.current = recognizer;
      recognizer.start();
    } catch (err) {
      console.warn("Speech init failed:", err);
      setIsListeningVoice(false);
    }
  };

  // Handle GPS location share
  const handleShareLocation = async () => {
    try {
      const coords = await geoService.getCurrentCoordinates();
      const address = geoService.getReadableAddress(coords.lat, coords.lng);
      setCurrentCoords({ ...coords, address });
      const locationNote = `📍 My current GPS location is: ${address} (Lat: ${coords.lat}, Lng: ${coords.lng}).`;
      handleSendMessage(locationNote);
    } catch (err) {
      addToast({
        type: "warning",
        title: "GPS Unavailable",
        message: "Could not read GPS location. Please mention your street or area in chat."
      });
    }
  };

  // Send message to Gemini AI or Fallback Engine
  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === "string" ? textToSend : inputMessage).trim();
    if (!text || isTyping) return;

    setInputMessage("");

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: text
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsTyping(true);

    try {
      const response = await geminiChatService.sendGeminiChatMessage({
        messages: nextHistory,
        currentReport: draftReport,
        currentCoords
      });

      if (response?.extractedReport) {
        setDraftReport(response.extractedReport);
      }

      const aiMsg = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: response.message,
        suggestions: response.suggestions || [],
        extractedReport: response.extractedReport,
        isLocalFallback: response.isLocalFallback,
        modelUsed: response.modelUsed
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("Chat error:", err);
      const fallbackMsg = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: "I have recorded your issue. Please review the ticket below and tap **Confirm & Dispatch** so rescue teams can be deployed to your location.",
        extractedReport: draftReport
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Submit the generated ticket directly through CitizenContext
  const handleConfirmAndSubmitReport = async (reportToSubmit) => {
    const report = reportToSubmit || draftReport;
    if (!report) return;

    setIsSubmittingReport(true);
    playEmergencyAudio("beep");

    try {
      // Ensure GPS coordinates are filled
      let finalLocation = {
        lat: currentCoords?.lat || 13.0827,
        lng: currentCoords?.lng || 80.2707,
        address: report.locationText || currentCoords?.address || "Field Emergency Sector",
        landmark: "Reported via AI Assistant"
      };

      const result = await submitDistressReport({
        title: report.title || `${report.category.toUpperCase()} Crisis at ${finalLocation.address}`,
        category: report.category || "flood",
        peopleCount: Number(report.peopleCount) || 1,
        hasMedicalEmergency: Boolean(report.hasMedicalEmergency),
        medicalDetails: report.medicalDetails || "",
        description: `${report.description}\n\n[Filed conversationally via JEEVA Gemini AI Emergency Assistant]`,
        location: finalLocation
      });

      const rawId = result?.incidentId || result?.report?.localId || `JEEVA-2026-${Math.floor(100 + Math.random() * 900)}`;
      const formattedId = rawId.startsWith("INC-") ? rawId.replace("INC-", "JEEVA-") : rawId;

      const receipt = {
        id: formattedId,
        category: report.category,
        title: report.title,
        priorityScore: result?.priorityScore || 8.5,
        severity: result?.severity || "High",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setSubmittedIncident(receipt);

      // Add confirmation message to chat
      const confirmationMsg = {
        id: `confirmation-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: `🚨 **EMERGENCY REPORT DISPATCHED!**\n\nYour distress report has been submitted to Rescue Command with Incident ID **${formattedId}**.\n\nRescue boats, ambulances, and response teams have been notified on the live command dashboard.`,
        isConfirmedTicket: true,
        incidentReceipt: receipt
      };

      setMessages((prev) => [...prev, confirmationMsg]);
      // Clear draft report since it is submitted
      setDraftReport(null);
    } catch (submitErr) {
      console.error("Submission failed:", submitErr);
      addToast({
        type: "danger",
        title: "Submission Issue",
        message: "Failed to dispatch report. Retrying or saving offline..."
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Start fresh chat
  const handleResetChat = () => {
    setDraftReport(null);
    setSubmittedIncident(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content:
          "👋 **New Emergency Chat Started.**\n\nTell me about your emergency, or select one of the common issues below:",
        suggestions: [
          "🌊 Flood water entering house",
          "👥 Family trapped on roof",
          "🏥 Need urgent medical help",
          "📍 Share my GPS location"
        ]
      }
    ]);
  };

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Bottom Right Corner) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2 select-none">
        {/* Floating Tooltip / Attention Badge */}
        {!isOpen && hasUnreadNotice && (
          <div className="bg-white/95 backdrop-blur-md border border-blue-200 text-slate-800 shadow-xl rounded-2xl px-3.5 py-2 text-xs flex items-center gap-2 animate-bounce cursor-pointer max-w-[240px]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <div onClick={() => setIsOpen(true)}>
              <p className="font-bold text-blue-700 leading-tight">Need help reporting?</p>
              <p className="text-[11px] text-slate-500">Tap here to chat with AI</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHasUnreadNotice(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* The Main Circular FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Emergency Assistant"
          className={`group relative flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
            isOpen
              ? "w-13 h-13 sm:w-14 sm:h-14 bg-slate-800 text-white hover:bg-slate-900"
              : "w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white hover:scale-105 hover:shadow-blue-500/30"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-90" />
          ) : (
            <div className="flex items-center justify-center relative">
              <Sparkles className="w-7 h-7 animate-pulse text-amber-300" />
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 2. CHATBOX MODAL WINDOW (Anchored in Bottom Right Corner) */}
      {isOpen && (
        <div
          className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[410px] h-[580px] sm:h-[620px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight text-white">JEEVA AI Assistant</h3>
                  <span className="px-1.5 py-0.2 bg-white/20 text-[10px] font-semibold rounded-full text-white/90">
                    Gemini Live
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-blue-100">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live AI Online</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[10px] text-blue-200">
                    <Languages className="w-3 h-3 text-cyan-300" />
                    <span>All Languages</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              {/* Reset chat */}
              <button
                onClick={handleResetChat}
                title="Start new conversation"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Minimize / Close */}
              <button
                onClick={() => setIsOpen(false)}
                title="Close chatbox"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-normal">
                    {msg.content}
                  </div>

                  <div
                    className={`mt-1 text-[10px] text-right ${
                      msg.sender === "user" ? "text-blue-200" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Confirmed Incident Receipt Card */}
                {msg.isConfirmedTicket && msg.incidentReceipt && (
                  <div className="mt-2.5 w-full max-w-[95%] bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-slate-800 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Incident Logged: {msg.incidentReceipt.id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-extrabold">
                        Priority: {msg.incidentReceipt.priorityScore}/10
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Emergency response teams and dispatchers have received this beacon. Coordinates tagged on map.
                    </p>

                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-emerald-200/80">
                      {onOpenMyReports && (
                        <button
                          onClick={onOpenMyReports}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          View in My Reports →
                        </button>
                      )}
                      <a
                        href="tel:112"
                        className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call 112</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Extracted Ticket Review Card (Before Submission) */}
                {msg.extractedReport && !msg.isConfirmedTicket && msg.extractedReport.isReadyToSubmit && (
                  <div className="mt-2.5 w-full max-w-[95%] bg-white border-2 border-blue-200 rounded-xl p-3.5 shadow-md space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-blue-50">
                          {getCategoryIcon(msg.extractedReport.category)}
                        </span>
                        <span className="font-bold text-xs text-slate-900 capitalize">
                          {msg.extractedReport.category.replace("_", " ")} Emergency
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Ready to Dispatch
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <p className="font-semibold text-slate-900 text-xs">
                        {msg.extractedReport.title}
                      </p>
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">
                          {msg.extractedReport.locationText || "Current GPS Location"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 pt-0.5">
                        <span>
                          👥 People: <strong>{msg.extractedReport.peopleCount || 1}</strong>
                        </span>
                        {msg.extractedReport.hasMedicalEmergency && (
                          <span className="text-red-600 font-bold flex items-center gap-0.5">
                            <HeartPulse className="w-3 h-3" />
                            <span>Medical Alert</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={isSubmittingReport}
                      onClick={() => handleConfirmAndSubmitReport(msg.extractedReport)}
                      className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      {isSubmittingReport ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching to Rescue Teams...</span>
                        </>
                      ) : (
                        <>
                          <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>🚨 Confirm & Dispatch Emergency Report</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Suggestions / Prompt Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && !msg.isConfirmedTicket && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (suggestion.toLowerCase().includes("gps") || suggestion.toLowerCase().includes("location")) {
                            handleShareLocation();
                          } else {
                            handleSendMessage(suggestion);
                          }
                        }}
                        className="text-[11px] px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-full transition-colors shadow-2xs font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-2.5 rounded-2xl w-fit border border-slate-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span className="animate-pulse">Gemini AI is analyzing your situation...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Location Share Bar */}
          <div className="px-3 py-1 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <button
              type="button"
              onClick={handleShareLocation}
              className="flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold transition-colors"
            >
              <MapPin className="w-3 h-3 text-red-500" />
              <span>📍 Share My GPS Location</span>
            </button>
            <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
              {currentCoords?.address ? currentCoords.address : "GPS Ready"}
            </span>
          </div>

          {/* Input Bar */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Mic Voice Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListeningVoice ? "Stop recording" : "Speak your emergency"}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isListeningVoice
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListeningVoice ? "Listening to your voice..." : "Type or speak in any language (Hindi, Tamil, English...)"}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
