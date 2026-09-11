import React, { useState } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { WifiOff, RefreshCw, ChevronDown, ChevronUp, Database, CheckCircle, Camera, Mic } from "lucide-react";

export const OfflineSyncBanner = () => {
  const { isOnline, offlineOutbox, syncOfflineReports, toggleOnlineStatus, t } = useCitizenEmergency();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (offlineOutbox.length === 0 && isOnline) {
    return null;
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      toggleOnlineStatus(true);
      setIsSyncing(true);
      setTimeout(async () => {
        await syncOfflineReports();
        setIsSyncing(false);
      }, 500);
    } else {
      setIsSyncing(true);
      await syncOfflineReports();
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3.5 sm:p-4 mb-4 text-amber-900 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-amber-950">
                {!isOnline
                  ? (t.offlineNotice || "Offline — Reports, photos and audio saved locally.")
                  : "Connection Restored — Ready to sync reports to database"}
              </span>
              {offlineOutbox.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  {offlineOutbox.length} Saved on Device
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              {!isOnline
                ? "You can take photos and record voice distress notes. Everything is stored on your device and will sync to the database automatically when internet connects."
                : "Ready to upload your saved photos, audio recordings, and distress reports."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end">
          {offlineOutbox.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-amber-900 hover:text-amber-950 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 flex items-center gap-1 transition-colors shadow-xs font-medium cursor-pointer"
            >
              <span>{isExpanded ? "Hide Saved Reports" : `View Saved Reports (${offlineOutbox.length})`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{!isOnline ? "Restore Connection" : isSyncing ? "Syncing..." : "Sync to Database"}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar when Synchronizing */}
      {isSyncing && (
        <div className="mt-3 pt-2 border-t border-amber-200">
          <div className="flex items-center justify-between text-xs text-amber-900 mb-1 font-medium">
            <span>Uploading pictures, audio recordings, and coordinates to database...</span>
          </div>
          <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-700 rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Expandable Outbox List */}
      {isExpanded && offlineOutbox.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
          <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-700" />
            <span>Saved Offline Media &amp; Reports ({offlineOutbox.length})</span>
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {offlineOutbox.map((report) => (
              <div
                key={report.localId}
                className="p-3 rounded-lg bg-white border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-slate-800 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {report.photoUrl ? (
                    <img
                      src={report.photoUrl}
                      alt="Field Thumbnail"
                      className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 truncate block">
                      {report.title}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {report.category} • {report.peopleCount} people affected
                    </p>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {report.photoUrl && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          <Camera className="w-2.5 h-2.5" />
                          <span>Photo Stored</span>
                        </span>
                      )}
                      {(report.audioBase64 || report.audioUrl) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          <Mic className="w-2.5 h-2.5" />
                          <span>Audio Note Stored</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-1 rounded-md font-semibold whitespace-nowrap self-start sm:self-center shrink-0">
                  Waiting for connection
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
