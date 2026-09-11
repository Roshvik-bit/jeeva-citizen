import React from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import {
  ShieldAlert,
  Globe,
  Radio,
  Volume2,
  FileText
} from "lucide-react";

export const CitizenNavbar = ({ onOpenMyReports }) => {
  const {
    language,
    setLanguage,
    t,
    isOnline,
    toggleOnlineStatus,
    offlineOutbox,
    myReports,
    playEmergencyAudio
  } = useCitizenEmergency();

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी (Hindi)" },
    { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
    { code: "bn", label: "বাংলা (Bengali)" },
    { code: "ta", label: "தமிழ் (Tamil)" },
    { code: "te", label: "తెలుగు (Telugu)" },
    { code: "ml", label: "മലയാളം (Malayalam)" },
    { code: "mr", label: "मराठी (Marathi)" }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand: JEEVA Citizen Portal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
              <img src="/logo.png" alt="JEEVA Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                  {t.appName || "JEEVA"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Citizen
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline mt-0.5">
                {t.tagline || "Emergency Incident Reporting & SOS"}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick My Reports Trigger */}
          {onOpenMyReports && (
            <button
              onClick={onOpenMyReports}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden xs:inline">{t.myReports || "My Reports"}</span>
              {myReports && myReports.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {myReports.length}
                </span>
              )}
            </button>
          )}

          {/* Online / Offline Status Button */}
          <button
            onClick={() => toggleOnlineStatus()}
            title={isOnline ? "Click to simulate Offline Mode" : "Click to simulate Online Reconnection"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isOnline
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-600" : "bg-red-600"
              }`}
            />
            <span className="hidden sm:inline">{isOnline ? (t.online || "Online") : (t.offline || "Offline")}</span>
            {!isOnline && offlineOutbox.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                {offlineOutbox.length}
              </span>
            )}
          </button>

          {/* Multilingual Selector */}
          <div className="relative">
            <label htmlFor="language-select-citizen" className="sr-only">Select Language</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-slate-700 focus-within:border-blue-500">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
              <select
                id="language-select-citizen"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1 max-w-[90px] sm:max-w-none"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio Siren Test Button */}
          <button
            onClick={() => playEmergencyAudio("siren")}
            title="Test Emergency Alert Tone"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Sound Siren"
          >
            <Volume2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </header>
  );
};
