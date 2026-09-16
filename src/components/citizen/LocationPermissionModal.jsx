import React from "react";
import { MapPinOff, AlertTriangle, RefreshCw, X, ShieldAlert, Smartphone, Globe, ExternalLink, CheckCircle } from "lucide-react";

export const LocationPermissionModal = ({ isOpen, onClose, onRetry, isRetrying }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MapPinOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Turn On Location Access
              </h3>
              <p className="text-[11px] text-red-100 font-medium">
                Couldn't detect GPS coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          {/* Urgent Notice Card */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block text-red-950 mb-0.5">
                Location Permission is Blocked
              </span>
              During an emergency SOS dispatch, rescue teams require your live GPS coordinates to deploy rescue boats, ambulances, and evacuation units to your exact spot.
            </div>
          </div>

          {/* Quick Steps on How to Enable */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>How to unblock location in your browser:</span>
            </h4>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Look at the top address bar in your browser and tap the <strong>Lock (🔒)</strong> or <strong>Site Settings (⚙️/tune)</strong> icon next to the URL.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Find <strong>Permissions → Location</strong> and change it from <em>Blocked</em> to <strong>Allow</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tap the <strong>"Try Again / Detect GPS"</strong> button below to lock your coordinates.
                </p>
              </div>
            </div>
          </div>

          {/* Phone Settings Hint */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-900 text-[11px]">
            <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Using Mobile?</strong> Ensure system Location Services are toggled <strong>ON</strong> in your device settings (Settings → Privacy/Location).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Checking GPS Access..." : "Try Again / Detect GPS"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs sm:text-sm transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
