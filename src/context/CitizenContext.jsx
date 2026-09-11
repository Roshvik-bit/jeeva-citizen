import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  storageService,
  mockAiClassifier,
  calculatePriorityScore,
  duplicateDetector,
  geoService,
  supabaseService,
  translations
} from "@jeeva/shared";

const CitizenContext = createContext();

export const CitizenProvider = ({ children }) => {
  const [language, setLanguage] = useState("en");
  const [isOnline, setIsOnline] = useState(true);
  const [citizenId] = useState(() => storageService.getCitizenSessionId());

  // Citizen's personal reports list
  const [myReports, setMyReports] = useState(() => {
    return storageService.getUserReports();
  });

  // Offline queued reports
  const [offlineOutbox, setOfflineOutbox] = useState(() => {
    return storageService.getOfflineOutbox();
  });

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, duration: 4500, ...toast }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Emergency Siren and Audio Alerts
  const activeSirenAudioRef = useRef(null);

  const playSynthSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.35);
      osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.7);
      osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 1.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.4);
    } catch (_) {}
  };

  const playSynthBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  };

  const playEmergencyAudio = useCallback((toneType = "siren") => {
    try {
      if (toneType === "siren") {
        if (
          activeSirenAudioRef.current &&
          !activeSirenAudioRef.current.paused &&
          activeSirenAudioRef.current.currentTime > 0 &&
          activeSirenAudioRef.current.currentTime < 5
        ) {
          return;
        }

        if (activeSirenAudioRef.current) {
          try {
            activeSirenAudioRef.current.pause();
            activeSirenAudioRef.current.currentTime = 0;
          } catch (_) {}
        }

        const audio = new Audio("/sounds/android-emergency-alert-tone_cLPHXHO9.mp3");
        audio.volume = 0.95;
        activeSirenAudioRef.current = audio;

        audio.addEventListener("ended", () => {
          activeSirenAudioRef.current = null;
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("HTML5 Audio prevented, fallback to synth:", err);
            playSynthSiren();
          });
        }
        return;
      }

      if (toneType === "beep") {
        playSynthBeep();
      }
    } catch (err) {
      console.warn("Audio playback exception:", err);
    }
  }, []);

  const stopEmergencyAudio = useCallback(() => {
    if (activeSirenAudioRef.current) {
      try {
        activeSirenAudioRef.current.pause();
        activeSirenAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeSirenAudioRef.current = null;
    }
  }, []);

  // Preload audio
  useEffect(() => {
    try {
      const audio = new Audio("/sounds/android-emergency-alert-tone_cLPHXHO9.mp3");
      audio.preload = "auto";
      audio.load();
    } catch (_) {}
  }, []);

  // Reconcile citizen reports with Supabase and listen for Realtime updates from Rescue Command
  useEffect(() => {
    if (!supabaseService.isConfigured() || !citizenId) return;

    // Fetch cloud status for this citizen's reports
    supabaseService.fetchIncidentsByCitizenId(citizenId).then((cloudReports) => {
      if (cloudReports && cloudReports.length > 0) {
        setMyReports((prev) => {
          const map = new Map();
          // Keep local reports
          prev.forEach((r) => map.set(r.id || r.localId, r));
          // Merge cloud updates
          cloudReports.forEach((c) => {
            const existing = map.get(c.id);
            map.set(c.id, existing ? { ...existing, ...c } : c);
          });
          const merged = Array.from(map.values());
          return merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        });
      }
    });

    // Realtime channel: listen for updates from Rescue Command
    const unsubscribe = supabaseService.subscribeToCitizenIncidents(citizenId, (updatedIncident) => {
      if (!updatedIncident) return;

      let hasStatusChange = false;

      // Update in citizen's state
      setMyReports((prev) => {
        const existing = prev.find((r) => r.id === updatedIncident.id || r.localId === updatedIncident.id);
        if (!existing) return prev;

        if (existing.status !== updatedIncident.status || existing.assignedUnit !== updatedIncident.assignedUnit) {
          hasStatusChange = true;
        }

        const updatedList = prev.map((r) => {
          if (r.id === updatedIncident.id || r.localId === updatedIncident.id) {
            return {
              ...r,
              ...updatedIncident,
              status: updatedIncident.status,
              assignedUnit: updatedIncident.assignedUnit || r.assignedUnit
            };
          }
          return r;
        });

        // Update local storage
        storageService.updateUserReportStatus(
          updatedIncident.id,
          updatedIncident.status,
          updatedIncident.assignedUnit
        );

        return updatedList;
      });

      if (hasStatusChange) {
        playEmergencyAudio("beep");
        addToast({
          type: "info",
          title: `Rescue Update: Incident #${updatedIncident.id}`,
          message: `Status updated to "${updatedIncident.status}"${
            updatedIncident.assignedUnit ? ` (Assigned: ${updatedIncident.assignedUnit})` : ""
          }.`
        });
      }
    });

    // Background reconciliation every 5 seconds to ensure continuous seamless sync
    const reconciler = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      supabaseService.fetchIncidents().then((allIncidents) => {
        if (!allIncidents || allIncidents.length === 0) return;
        setMyReports((prev) => {
          let hasChanges = false;
          const updated = prev.map((localReport) => {
            const match = allIncidents.find((cloud) => cloud.id === localReport.id || cloud.id === localReport.localId);
            if (match && (match.status !== localReport.status || match.assignedUnit !== localReport.assignedUnit)) {
              hasChanges = true;
              return {
                ...localReport,
                status: match.status,
                assignedUnit: match.assignedUnit || localReport.assignedUnit
              };
            }
            return localReport;
          });
          if (hasChanges) {
            updated.forEach((u) => {
              storageService.updateUserReportStatus(u.id, u.status, u.assignedUnit);
            });
            return updated;
          }
          return prev;
        });
      });
    }, 5000);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      clearInterval(reconciler);
    };
  }, [citizenId, addToast, playEmergencyAudio]);

  // Sync queued offline reports to Supabase
  const syncOfflineReports = useCallback(async () => {
    const queue = await storageService.getOfflineOutboxAsync();
    if (!queue || queue.length === 0) return;

    addToast({
      type: "info",
      title: "Sync Initiated",
      message: `Uploading ${queue.length} offline distress report(s) to Rescue Command...`
    });

    let newlySyncedCount = 0;
    let mediaSyncedCount = 0;

    for (const report of queue) {
      let restoredAudioUrl = report.audioUrl;
      if (report.audioBase64) {
        restoredAudioUrl = storageService.base64ToBlobUrl(report.audioBase64, report.audioMimeType || "audio/webm");
      }

      if (report.photoUrl || report.audioBase64 || restoredAudioUrl) {
        mediaSyncedCount++;
      }

      let aiResult = report.aiClassification;
      if (!aiResult || aiResult.isFalseAlarm === undefined) {
        aiResult = await mockAiClassifier.verifyReport({
          title: report.title,
          description: report.description,
          voiceTranscript: report.voiceTranscript,
          category: report.category,
          hasMedicalEmergency: report.hasMedicalEmergency,
          peopleCount: report.peopleCount,
          photoUrl: report.photoUrl
        });
      }

      let syncedPhotoUrl = report.photoUrl;
      if (supabaseService.isConfigured() && syncedPhotoUrl && !syncedPhotoUrl.startsWith("http")) {
        try {
          syncedPhotoUrl = await supabaseService.uploadPhotoFile(syncedPhotoUrl, report.localId || "offline");
        } catch (e) {
          console.warn("Offline photo sync upload error:", e);
        }
      }

      let syncedAudioUrl = null;
      const offlineAudioSource = report.audioBlob || report.audioBase64 || report.audioUrl;
      if (supabaseService.isConfigured() && offlineAudioSource) {
        try {
          syncedAudioUrl = await supabaseService.uploadAudioFile(offlineAudioSource, report.localId || "offline");
        } catch (e) {
          console.warn("Offline audio sync upload error:", e);
        }
      }

      const activePlayableAudio = syncedAudioUrl || restoredAudioUrl || null;
      const scored = calculatePriorityScore({
        ...report,
        aiClassification: aiResult,
        corroboratingReportsCount: 1
      });

      const isOfflineSos = Boolean(report.isQuickSOS || report.isSOS || report.title?.includes("SOS"));
      const newIncident = {
        id: "INC-2026-" + Math.floor(100 + Math.random() * 900),
        citizenId: citizenId,
        title: report.title || `${report.category.toUpperCase()} Distress Alert at ${report.location?.address || "Unknown"}`,
        category: report.category,
        severity: scored.severity,
        status: scored.isFalseAlarm ? "Resolved" : "Pending",
        timestamp: report.timestamp || new Date().toISOString(),
        location: report.location,
        peopleCount: isOfflineSos || report.peopleCount == null ? null : (report.peopleCount || 1),
        isQuickSOS: isOfflineSos,
        isSOS: isOfflineSos,
        hasMedicalEmergency: report.hasMedicalEmergency || false,
        medicalDetails: report.medicalDetails || "",
        description: report.description || (isOfflineSos ? "Emergency SOS distress beacon logged offline." : "Field emergency alert logged by citizen."),
        photoUrl: isOfflineSos ? null : (syncedPhotoUrl || report.photoUrl || null),
        aiClassification: aiResult,
        voiceTranscript: report.voiceTranscript || "",
        audioUrl: syncedAudioUrl || activePlayableAudio,
        audioBase64: null,
        isOfflineSync: true,
        syncedAt: new Date().toISOString(),
        recommendedResource: aiResult?.recommendedResource || "Rescue Boat",
        assignedUnit: null,
        priorityScore: scored.priorityScore,
        isFalseAlarm: scored.isFalseAlarm,
        isRealReport: scored.isRealReport,
        isAbsoluteEmergency: scored.isAbsoluteEmergency,
        disasterTypeTags: scored.disasterTypeTags || [],
        scoreBreakdown: scored.scoreBreakdown,
        corroboratingReportsCount: 1,
        subReports: []
      };

      if (supabaseService.isConfigured()) {
        await supabaseService.insertIncident(newIncident);
      }

      storageService.updateUserReportStatus(report.localId, "Pending (Synced)", null);
      newlySyncedCount++;
    }

    storageService.clearOfflineOutbox();
    setOfflineOutbox([]);
    setMyReports(storageService.getUserReports());

    playEmergencyAudio("beep");
    addToast({
      type: "success",
      title: "Offline Sync Complete",
      message: `Successfully synchronized ${newlySyncedCount} emergency alert(s) including ${mediaSyncedCount} photo & audio file(s) to Rescue Command!`
    });
  }, [citizenId, addToast, playEmergencyAudio]);

  // Handle Online/Offline network toggle
  const toggleOnlineStatus = useCallback(
    (forcedState) => {
      const nextState = typeof forcedState === "boolean" ? forcedState : !isOnline;
      setIsOnline(nextState);

      if (nextState) {
        addToast({
          type: "success",
          title: "Network Connected",
          message: "Online telemetry restored. Connecting to Rescue Command Database."
        });
        setTimeout(async () => {
          const currentOutbox = await storageService.getOfflineOutboxAsync();
          if (currentOutbox && currentOutbox.length > 0) {
            syncOfflineReports();
          }
        }, 300);
      } else {
        addToast({
          type: "warning",
          title: "Offline Mode Active",
          message: "Reports, photos, and voice recordings will be saved locally on your device."
        });
      }
    },
    [isOnline, addToast, syncOfflineReports]
  );

  // Auto-detect browser connectivity
  useEffect(() => {
    const handleOnline = () => toggleOnlineStatus(true);
    const handleOffline = () => toggleOnlineStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toggleOnlineStatus]);

  // Submit Emergency Report
  const submitDistressReport = useCallback(
    async (rawReport) => {
      const timestamp = new Date().toISOString();

      if (!isOnline) {
        let audioBase64 = rawReport.audioBase64;
        if (!audioBase64 && rawReport.audioUrl) {
          try {
            const res = await fetch(rawReport.audioUrl);
            if (res.ok) {
              const blob = await res.blob();
              audioBase64 = await storageService.blobToBase64(blob);
            }
          } catch (e) {}
        }

        const queued = storageService.addOfflineReport({
          ...rawReport,
          citizenId,
          audioBase64,
          timestamp
        });

        storageService.addUserReport({
          id: queued.localId,
          citizenId,
          ...queued,
          status: "Pending Sync"
        });

        setOfflineOutbox(storageService.getOfflineOutbox());
        setMyReports(storageService.getUserReports());

        playEmergencyAudio("beep");
        addToast({
          type: "warning",
          title: "Saved to Offline Outbox",
          message: "Distress report stored on device with photo and audio. Will auto-sync when network reconnects!"
        });
        return { success: true, isOffline: true, report: queued, incidentId: queued.localId };
      }

      // Online: AI verification
      let aiResult = rawReport.aiClassification;
      if (!aiResult || aiResult.isFalseAlarm === undefined || aiResult.isInvalidImage === undefined) {
        aiResult = await mockAiClassifier.verifyReport({
          title: rawReport.title,
          description: rawReport.description,
          voiceTranscript: rawReport.voiceTranscript,
          category: rawReport.category,
          hasMedicalEmergency: rawReport.hasMedicalEmergency,
          peopleCount: rawReport.peopleCount,
          photoUrl: rawReport.photoUrl,
          fileName: rawReport.fileName || "",
          imageMetadata: rawReport.imageMetadata || {}
        });
      }

      const incidentId = "INC-2026-" + Math.floor(100 + Math.random() * 900);

      // Upload Photo
      let publicPhotoUrl = rawReport.photoUrl;
      if (supabaseService.isConfigured() && publicPhotoUrl && !publicPhotoUrl.startsWith("http")) {
        try {
          publicPhotoUrl = await supabaseService.uploadPhotoFile(publicPhotoUrl, incidentId);
        } catch (e) {
          console.warn("Photo storage upload notice:", e);
        }
      }

      // Upload Audio
      let publicAudioUrl = null;
      const audioSource = rawReport.audioBlob || rawReport.audioUrl || rawReport.audioBase64;
      if (supabaseService.isConfigured() && audioSource) {
        try {
          publicAudioUrl = await supabaseService.uploadAudioFile(audioSource, incidentId);
        } catch (e) {
          console.warn("Audio storage upload notice:", e);
        }
      }

      const activePlayableAudio = publicAudioUrl || rawReport.audioUrl || null;
      const scored = calculatePriorityScore({
        ...rawReport,
        aiClassification: aiResult,
        timestamp,
        corroboratingReportsCount: 1
      });

      const assignedStatus = scored.status || (scored.isFalseAlarm ? "REJECTED" : "Pending");

      if (scored.isDigitalFake || aiResult?.isDigitalFake) {
        addToast({
          type: "warning",
          title: "⚠️ Digital Spoof Detected",
          message: "Image identified as a downloaded web photo, AI generation, or screen capture. Priority Score is strictly 0.0."
        });
      } else if (scored.isInvalidImage || aiResult?.isInvalidImage) {
        addToast({
          type: "warning",
          title: "Image Verification Alert",
          message: "Image does not appear to match a disaster emergency. Please upload a valid incident photo or provide a detailed text description."
        });
      }

      const isSosReport = Boolean(rawReport.isQuickSOS || rawReport.isSOS || rawReport.title?.includes("SOS"));
      const newCitizenIncident = {
        id: incidentId,
        citizenId: citizenId,
        title: rawReport.title || `${rawReport.category.toUpperCase()} Crisis at ${rawReport.location?.address || "Unknown"}`,
        category: rawReport.category,
        severity: scored.severity,
        status: assignedStatus,
        timestamp,
        location: rawReport.location,
        peopleCount: isSosReport || rawReport.peopleCount == null ? null : (rawReport.peopleCount || 1),
        isQuickSOS: isSosReport,
        isSOS: isSosReport,
        hasMedicalEmergency: rawReport.hasMedicalEmergency || false,
        medicalDetails: rawReport.medicalDetails || "",
        description: rawReport.description || (isSosReport ? "Emergency SOS distress beacon logged by refugee/citizen." : "Field emergency alert logged by citizen."),
        photoUrl: isSosReport ? null : (publicPhotoUrl || rawReport.photoUrl || null),
        aiClassification: aiResult,
        voiceTranscript: rawReport.voiceTranscript || "",
        audioUrl: publicAudioUrl || activePlayableAudio,
        audioBase64: null,
        recommendedResource: aiResult?.recommendedResource || "Rescue Boat",
        assignedUnit: null,
        priorityScore: scored.priorityScore,
        isFalseAlarm: scored.isFalseAlarm,
        isDigitalFake: Boolean(scored.isDigitalFake || aiResult?.isDigitalFake),
        isRequiresReview: scored.isRequiresReview,
        isInvalidImage: Boolean(scored.isInvalidImage || aiResult?.isInvalidImage),
        isRealReport: scored.isRealReport,
        isAbsoluteEmergency: scored.isAbsoluteEmergency,
        disasterTypeTags: scored.disasterTypeTags || [],
        verificationReason: aiResult?.verificationReason || "",
        scoreBreakdown: scored.scoreBreakdown,
        corroboratingReportsCount: 1,
        subReports: []
      };

      if (supabaseService.isConfigured()) {
        await supabaseService.insertIncident(newCitizenIncident);
      }

      // Add to personal user history
      storageService.addUserReport({
        id: incidentId,
        citizenId,
        ...rawReport,
        priorityScore: scored.priorityScore,
        severity: scored.severity,
        isFalseAlarm: scored.isFalseAlarm,
        isDigitalFake: Boolean(scored.isDigitalFake || aiResult?.isDigitalFake),
        peopleCount: isSosReport || rawReport.peopleCount == null ? null : (rawReport.peopleCount || 1),
        photoUrl: isSosReport ? null : (publicPhotoUrl || rawReport.photoUrl || null),
        audioUrl: publicAudioUrl || activePlayableAudio,
        audioBase64: null,
        timestamp,
        status: scored.isFalseAlarm ? "Resolved (False Alarm)" : "Pending"
      });
      setMyReports(storageService.getUserReports());

      if (scored.isFalseAlarm) {
        playEmergencyAudio("beep");
        addToast({
          type: "warning",
          title: scored.isDigitalFake ? "⚠️ Digital Spoof Flagged (Score 0.0)" : "⚠️ Report Flagged as False Alarm (Score 0.0)",
          message: scored.isDigitalFake
            ? "Image identified as a digital spoof (web download, AI image, or screen capture). Priority Score set strictly to 0.0/10."
            : "Report identified as a non-emergency or false alarm. Priority Score set strictly to 0.0/10."
        });
      } else {
        playEmergencyAudio("siren");
        addToast({
          type: "success",
          title: scored.isAbsoluteEmergency ? "🚨 Absolute Emergency Dispatched!" : "SOS Alert Dispatched!",
          message: `Incident #${incidentId} logged (Priority: ${scored.priorityScore}/10). Rescue teams alerted on operations map.`
        });
      }

      return {
        success: true,
        isOffline: false,
        incidentId: incidentId,
        isFalseAlarm: scored.isFalseAlarm,
        isDigitalFake: Boolean(scored.isDigitalFake || aiResult?.isDigitalFake),
        isRequiresReview: scored.isRequiresReview,
        isInvalidImage: Boolean(scored.isInvalidImage || aiResult?.isInvalidImage),
        status: assignedStatus,
        priorityScore: scored.priorityScore,
        severity: scored.severity,
        verificationReason: aiResult?.verificationReason
      };
    },
    [isOnline, citizenId, addToast, playEmergencyAudio]
  );

  // 1-Tap Quick SOS Trigger
  const triggerQuickSOS = useCallback(async () => {
    playEmergencyAudio("siren");
    const coords = await geoService.getCurrentCoordinates();
    const address = geoService.getReadableAddress(coords.lat, coords.lng);

    const sosPayload = {
      title: "CRITICAL 1-TAP SOS DISTRESS BEACON",
      category: "flood",
      peopleCount: null,
      isQuickSOS: true,
      isSOS: true,
      hasMedicalEmergency: true,
      medicalDetails: "Immediate evacuation requested via 1-Tap Emergency SOS beacon.",
      description: "Refugee/Citizen activated high-priority panic beacon. Urgent life safety response required.",
      location: {
        lat: coords.lat,
        lng: coords.lng,
        address: address,
        landmark: "GPS Beacon Tag"
      },
      photoUrl: null,
      voiceTranscript: "AUTOMATIC SOS: User pressed instant emergency distress button."
    };

    return await submitDistressReport(sosPayload);
  }, [submitDistressReport, playEmergencyAudio]);

  const t = { ...translations.en, ...(translations[language] || {}) };

  return (
    <CitizenContext.Provider
      value={{
        citizenId,
        language,
        setLanguage,
        t,
        isOnline,
        toggleOnlineStatus,
        offlineOutbox,
        myReports,
        toasts,
        addToast,
        removeToast,
        submitDistressReport,
        triggerQuickSOS,
        syncOfflineReports,
        playEmergencyAudio,
        stopEmergencyAudio
      }}
    >
      {children}
    </CitizenContext.Provider>
  );
};

export const useCitizenEmergency = () => {
  const context = useContext(CitizenContext);
  if (!context) {
    throw new Error("useCitizenEmergency must be used within a CitizenProvider");
  }
  return context;
};

// Also export as useEmergency for backward compatibility with existing citizen components
export const useEmergency = useCitizenEmergency;
