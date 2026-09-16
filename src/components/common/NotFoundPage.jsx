import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, Home, PhoneCall, ShieldAlert, ArrowLeft } from "lucide-react";

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "404 - Page Not Found | JEEVA";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#1F2937]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-xs overflow-hidden">
              <img src="/logo.png" alt="JEEVA Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                JEEVA
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Citizen
              </span>
            </div>
          </div>

          <a
            href="tel:112"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency 112</span>
          </a>
        </div>
      </header>

      {/* Main 404 Error Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-md p-6 sm:p-8 text-center">
          {/* Warning Icon Badge */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-xs">
            <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
          </div>

          {/* 404 Status */}
          <div className="inline-block px-2.5 py-1 mb-3 rounded-full text-xs font-bold bg-slate-100 text-slate-700 tracking-wide">
            ERROR 404 • PAGE NOT FOUND
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Invalid Portal Address
          </h1>

          <p className="text-slate-600 text-sm mb-4 leading-relaxed">
            The page or route you attempted to access does not exist on the JEEVA Citizen Portal.
          </p>

          {/* Path Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-6 text-xs text-slate-600 break-all font-mono">
            <span className="text-slate-400 select-none">Path: </span>
            <span className="text-red-600 font-semibold">{currentPath}</span>
          </div>

          {/* Urgent Helpline Alert Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 text-left flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-bold block mb-0.5">Need immediate emergency assistance?</span>
              Do not wait. Dial <a href="tel:112" className="font-extrabold underline text-red-700">112</a> or return to the portal to submit an instant SOS beacon.
            </div>
          </div>

          {/* Action Buttons: Return to Home, Go Back, and Call 112 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => navigate("/")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </div>

            <a
              href="tel:112"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Emergency Helpline (112)</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
        JEEVA Citizen Emergency Response Network • Official Disaster Field Support
      </footer>
    </div>
  );
};
