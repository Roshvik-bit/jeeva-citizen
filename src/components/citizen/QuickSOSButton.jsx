import React, { useState, useEffect } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { AlertOctagon, X, Check, Radio } from "lucide-react";

export const QuickSOSButton = () => {
  const { t, triggerQuickSOS, playEmergencyAudio, stopEmergencyAudio } = useCitizenEmergency();
  const [countdown, setCountdown] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let timer = null;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
        playEmergencyAudio("beep");
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      handleExecuteSOS();
    }
    return () => clearTimeout(timer);
  }, [countdown, playEmergencyAudio]);

  const handleStartSOS = () => {
    playEmergencyAudio("beep");
    // Pre-buffer audio on direct user touch/click gesture so playback is instantaneous
    try {
      const primer = new Audio("/sounds/android-emergency-alert-tone_cLPHXHO9.mp3");
      primer.preload = "auto";
      primer.load();
    } catch (_) {}
    setCountdown(3);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setCountdown(null);
    if (stopEmergencyAudio) stopEmergencyAudio();
  };

  const handleExecuteSOS = async () => {
    setIsSuccess(true);
    await triggerQuickSOS();
    setTimeout(() => {
      setIsSuccess(false);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {countdown !== null ? (
        // Countdown Failsafe State (3 -> 2 -> 1) with Blinking Light (No Step Badges or Extra Text)
        <div className="w-full max-w-sm bg-white border-2 border-red-600 rounded-2xl p-6 shadow-xl text-center flex flex-col items-center">
          {/* Central Pulsing / Blinking Light with Countdown Number */}
          <div className="flex justify-center my-3">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75 pointer-events-none" />
              <span className="absolute -inset-2 rounded-full border-2 border-red-300 animate-pulse pointer-events-none" />
              <div
                key={countdown}
                className="relative w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white text-3xl font-black font-mono shadow-lg animate-count-pop"
              >
                {countdown}
              </div>
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden my-4 border border-slate-200">
            <div
              className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>

          <button
            onClick={handleCancel}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
          >
            <X className="w-4 h-4 text-red-600" />
            <span>{t.cancel || "Cancel"}</span>
          </button>
        </div>
      ) : isSuccess ? (
        // Successful Dispatch State
        <div className="w-full max-w-sm bg-white border-2 border-green-600 rounded-2xl p-6 shadow-xl text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3 shadow-sm">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {t.sosSent || "Emergency Alert Sent! Coordinates Tagged."}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {t.teamsNotifiedDesc || "Rescue response teams notified. Keep phone on high volume."}
          </p>
        </div>
      ) : (
        // Default SOS Button
        <div className="flex flex-col items-center">
          <button
            onClick={handleStartSOS}
            className="group relative flex items-center justify-center w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl hover:shadow-2xl transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-200"
            aria-label="Trigger Emergency SOS"
          >
            {/* Outer subtle beacon ring */}
            <span className="absolute inset-0 rounded-full border-4 border-red-400/40 animate-ping-slow pointer-events-none" />

            <div className="flex flex-col items-center text-center px-4">
              <AlertOctagon className="w-12 h-12 sm:w-14 sm:h-14 mb-2 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase font-mono">
                {t.sosButton || "SOS"}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-red-100 mt-1 uppercase tracking-wider">
                {t.oneTouchSos || "Emergency Alert"}
              </span>
            </div>
          </button>

          <p className="text-xs text-slate-500 mt-4 text-center max-w-xs leading-relaxed">
            {t.sosSubtitle || "Captures GPS & notifies rescue control"}
          </p>
        </div>
      )}
    </div>
  );
};
