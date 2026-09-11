import React, { useEffect } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { AlertTriangle, CheckCircle, Info, X, WifiOff, Siren } from "lucide-react";

export const ToastContainer = () => {
  const { toasts, removeToast } = useCitizenEmergency();

  return (
    <div className="fixed top-20 right-4 z-[10000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getTheme = () => {
    switch (toast.type) {
      case "warning":
        return {
          border: "border-amber-300",
          icon: <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        };
      case "success":
        return {
          border: "border-green-300",
          icon: <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        };
      case "danger":
        return {
          border: "border-red-300",
          icon: <Siren className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        };
      case "info":
      default:
        return {
          border: "border-blue-300",
          icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border bg-white shadow-md text-slate-800 transition-all ${theme.border}`}
    >
      {theme.icon}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
