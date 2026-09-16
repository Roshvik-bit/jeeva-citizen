import React, { useState, useEffect, useCallback } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { geoService } from "@jeeva/shared";
import {
  AlertOctagon,
  X,
  Check,
  LocateFixed,
  MapPin,
  RefreshCw,
  Loader2,
  Navigation
} from "lucide-react";

export const QuickSOSButton = () => {
  const { t, triggerQuickSOS, playEmergencyAudio, stopEmergencyAudio, addToast } = useCitizenEmergency();
  const [countdown, setCountdown] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-Detect GPS States
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // GPS Auto-Detection Function
  const handleAutoDetectGPS = useCallback(async (showFeedback = true) => {
    setIsDetectingGps(true);
    setGpsError(null);
    try {
      const coords = await geoService.getCurrentCoordinates();
      let address = "";
      try {
        address = await geoService.reverseGeocodeOSM(coords.lat, coords.lng);
      } catch (_) {
        address = geoService.getReadableAddress(coords.lat, coords.lng);
      }

      const locationData = {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy || 10,
        isSimulated: coords.isSimulated,
        address: address || geoService.getReadableAddress(coords.lat, coords.lng)
      };

      setGpsCoords(locationData);

      if (showFeedback && addToast) {
        addToast({
          type: "success",
          title: "GPS Location Detected",
          message: `${locationData.lat.toFixed(4)}°N, ${locationData.lng.toFixed(4)}°E (±${locationData.accuracy}m)`
        });
      }
    } catch (err) {
      console.warn("Auto Detect GPS error:", err);
      setGpsError("Unable to acquire high-accuracy GPS.");
      if (showFeedback && addToast) {
        addToast({
          type: "error",
          title: "GPS Error",
          message: "Could not auto-detect GPS. Please enable location permissions."
        });
      }
    } finally {
      setIsDetectingGps(false);
    }
  }, [addToast]);

  // Auto-detect location in background on mount
  useEffect(() => {
    handleAutoDetectGPS(false);
  }, [handleAutoDetectGPS]);

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
    // Dispatch SOS tagged with the auto-detected GPS location
    await triggerQuickSOS(gpsCoords);
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
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden my-3 border border-slate-200">
            <div
              className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>

          {/* GPS Coordinates Tag Status in Countdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium my-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="truncate">
              {gpsCoords
                ? `Tagging GPS: ${gpsCoords.lat.toFixed(4)}°N, ${gpsCoords.lng.toFixed(4)}°E`
                : "Auto-detecting live GPS coordinates..."}
            </span>
          </div>

          <button
            onClick={handleCancel}
            className="w-full mt-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
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
          {gpsCoords && (
            <div className="mt-3 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
              📍 Transmitted: {gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E (±{gpsCoords.accuracy}m)
            </div>
          )}
        </div>
      ) : (
        // Default SOS Button View
        <div className="flex flex-col items-center w-full">
          {/* Main SOS Beacon Button */}
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

          <p className="text-xs text-slate-500 mt-3 text-center max-w-xs leading-relaxed">
            {t.sosSubtitle || "Captures GPS & notifies rescue control"}
          </p>

          {/* Dedicated "Auto Detect GPS" Button and Live Coordinates Card */}
          <div className="mt-4 w-full max-w-xs flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handleAutoDetectGPS(true)}
              disabled={isDetectingGps}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs border ${
                gpsCoords
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : isDetectingGps
                  ? "bg-slate-100 text-slate-500 border-slate-200 cursor-wait"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 active:scale-[0.98]"
              }`}
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Auto-Detecting GPS...</span>
                </>
              ) : gpsCoords ? (
                <>
                  <LocateFixed className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Auto Detect GPS: Active</span>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 ml-auto hover:rotate-180 transition-transform" />
                </>
              ) : (
                <>
                  <LocateFixed className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <span>Auto Detect GPS</span>
                </>
              )}
            </button>

            {/* GPS Location Details Card */}
            {gpsCoords ? (
              <div className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-left text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-emerald-950 truncate">
                      Refugee GPS Locked
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono shrink-0">
                      ±{gpsCoords.accuracy || 10}m
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono mt-0.5 truncate">
                    {gpsCoords.lat.toFixed(5)}°N, {gpsCoords.lng.toFixed(5)}°E
                  </p>
                  {gpsCoords.address && (
                    <p className="text-[10px] text-emerald-700 truncate mt-0.5">
                      {gpsCoords.address}
                    </p>
                  )}
                </div>
              </div>
            ) : gpsError ? (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-800 text-center">
                {gpsError}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
