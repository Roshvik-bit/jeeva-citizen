import React, { useState, useEffect, useCallback } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { storageService, getPlayableAudioUrl, verifyReportStatement, geoService } from "@jeeva/shared";
import { LocationPicker } from "./LocationPicker";
import { PhotoCaptureModal } from "./PhotoCaptureModal";
import { VoiceRecorderModal } from "./VoiceRecorderModal";
import { LocationPermissionModal } from "./LocationPermissionModal";
import {
  Waves,
  Users,
  HeartPulse,
  AlertTriangle,
  Building2,
  Flame,
  Send,
  Save,
  CheckCircle2,
  MapPin,
  MapPinOff,
  Clock,
  RotateCcw,
  ArrowRight,
  Camera,
  Mic,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  Zap,
  FileText,
  Activity,
  MoreHorizontal
} from "lucide-react";

export const EmergencyReportForm = ({ onSubmitted, onViewReportStatus }) => {
  const { isOnline, submitDistressReport, t, addToast } = useCitizenEmergency();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("flood");
  const [customCategory, setCustomCategory] = useState("");
  const [peopleCount, setPeopleCount] = useState(1);
  const [hasMedicalEmergency, setHasMedicalEmergency] = useState(false);
  const [medicalDetails, setMedicalDetails] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [aiClassification, setAiClassification] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAudioUrl, setVoiceAudioUrl] = useState(null);
  const [voiceAudioBase64, setVoiceAudioBase64] = useState(null);
  const [voiceAudioBlob, setVoiceAudioBlob] = useState(null);
  const [location, setLocation] = useState({
    lat: 13.0827,
    lng: 80.2707,
    address: "Ward 8 Riverbed Sector, Disaster Zone",
    landmark: "GPS Pin",
    accuracy: 10
  });

  // Location permission and detection states
  const [isLocationPermitted, setIsLocationPermitted] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  const checkAndAutoDetectLocation = useCallback(async (showModalOnBlocked = false) => {
    setIsCheckingLocation(true);
    try {
      const permState = await geoService.checkPermissionState();
      if (permState === "denied") {
        setIsLocationPermitted(false);
        if (showModalOnBlocked) {
          setIsPermissionModalOpen(true);
        }
        return;
      }

      const coords = await geoService.getCurrentCoordinates();
      if (coords.isBlocked) {
        setIsLocationPermitted(false);
        if (showModalOnBlocked) {
          setIsPermissionModalOpen(true);
        }
        return;
      }

      let address = "";
      try {
        address = await geoService.reverseGeocodeOSM(coords.lat, coords.lng);
      } catch (_) {
        address = geoService.getReadableAddress(coords.lat, coords.lng);
      }

      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        address: address || geoService.getReadableAddress(coords.lat, coords.lng),
        landmark: coords.isSimulated ? "Disaster Grid Checkpoint" : "GPS Triangulated",
        accuracy: coords.accuracy || 10
      });
      setIsLocationPermitted(true);
      setIsPermissionModalOpen(false);
    } catch (err) {
      console.warn("Location check error in EmergencyReportForm:", err);
      setIsLocationPermitted(false);
      if (showModalOnBlocked) {
        setIsPermissionModalOpen(true);
      }
    } finally {
      setIsCheckingLocation(false);
    }
  }, []);

  // Check location permission on mount
  useEffect(() => {
    checkAndAutoDetectLocation(true);
  }, [checkAndAutoDetectLocation]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  // 9 categories in 3 rows x 3 columns:
  // Row 1: Flood, People Trapped, Medical Emergency
  // Row 2: Blocked Road, Damaged Bridge, Fire
  // Row 3: Earthquake (Col 1), Tsunami (Col 2), Other (Col 3)
  const categories = [
    { id: "flood", label: t.flood || "Flood", icon: <Waves className="w-4 h-4 text-blue-600" /> },
    { id: "trapped", label: t.trapped || "People Trapped", icon: <Users className="w-4 h-4 text-orange-600" /> },
    { id: "medical", label: t.medical || "Medical Emergency", icon: <HeartPulse className="w-4 h-4 text-red-600" /> },
    { id: "blocked_road", label: t.blockedRoad || "Blocked Road", icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
    { id: "bridge", label: t.bridge || "Damaged Bridge", icon: <Building2 className="w-4 h-4 text-slate-600" /> },
    { id: "fire", label: t.fire || "Fire", icon: <Flame className="w-4 h-4 text-red-500" /> },
    { id: "earthquake", label: t.earthquake || "Earthquake", icon: <Activity className="w-4 h-4 text-amber-700" /> },
    { id: "tsunami", label: t.tsunami || "Tsunami", icon: <Waves className="w-4 h-4 text-cyan-600" /> },
    { id: "other", label: t.other || "Other", icon: <MoreHorizontal className="w-4 h-4 text-purple-600" /> }
  ];

  const handleResetForm = () => {
    setTitle("");
    setCategory("flood");
    setCustomCategory("");
    setDescription("");
    setVoiceTranscript("");
    setVoiceAudioUrl(null);
    setVoiceAudioBase64(null);
    setVoiceAudioBlob(null);
    setPhotoUrl(null);
    setAiClassification(null);
    setHasMedicalEmergency(false);
    setMedicalDetails("");
    setSubmittedReceipt(null);
  };

  const currentStatementCheck = verifyReportStatement([title, description, voiceTranscript].filter(Boolean).join(" "));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Do not allow submission without location access
    if (!isLocationPermitted) {
      setIsPermissionModalOpen(true);
      if (addToast) {
        addToast({
          type: "error",
          title: "Location Access Required",
          message: "You cannot submit an emergency report without location access. Please allow location permissions."
        });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const fullDescription = [
        description,
        voiceTranscript ? `[Voice Note: "${voiceTranscript}"]` : "",
        medicalDetails ? `[Medical Condition: ${medicalDetails}]` : ""
      ]
        .filter(Boolean)
        .join("\n\n");

      const categoryItem = categories.find((c) => c.id === category);
      const isCustomOther = category === "other" && customCategory.trim().length > 0;
      const categoryLabel = isCustomOther ? customCategory.trim() : (categoryItem?.label || category);
      const defaultAutoTitle = `${categoryLabel} Emergency at ${location.address || "Disaster Zone"}`;
      const finalTitle = title.trim() || defaultAutoTitle;

      // Ensure photo is compressed so request payload stays < 40KB (never exceeds PostgREST limits)
      let safePhoto = photoUrl;
      if (safePhoto) {
        try {
          safePhoto = await storageService.compressImageFile(safePhoto, 640, 640, 0.65);
        } catch (e) {}
      }

      const result = await submitDistressReport({
        title: finalTitle,
        category: isCustomOther ? customCategory.trim() : category,
        customCategory: isCustomOther ? customCategory.trim() : undefined,
        peopleCount: Number(peopleCount),
        hasMedicalEmergency,
        medicalDetails,
        description: fullDescription || "Emergency report filed by citizen.",
        location,
        photoUrl: safePhoto,
        aiClassification,
        voiceTranscript,
        audioUrl: voiceAudioUrl,
        audioBase64: voiceAudioBase64,
        audioBlob: voiceAudioBlob
      });

      const rawId = result?.incidentId || result?.report?.localId || `JEEVA-2026-${Math.floor(100 + Math.random() * 900)}`;
      const incidentIdFormatted = rawId.startsWith("INC-")
        ? rawId.replace("INC-", "JEEVA-")
        : rawId.startsWith("JEEVA-")
        ? rawId
        : `JEEVA-2026-${rawId.slice(-3)}`;

      const currentCategoryLabel = categoryLabel;

      const isDigitalFake = Boolean(
        result?.isDigitalFake ||
        aiClassification?.isDigitalFake
      );

      const isInvalidImg = Boolean(
        isDigitalFake ||
        result?.isInvalidImage ||
        aiClassification?.isInvalidImage ||
        (photoUrl && (aiClassification?.isValidDisaster === false || result?.isValidDisaster === false))
      );

      const isFalse = Boolean(
        isDigitalFake ||
        result?.isFalseAlarm ||
        aiClassification?.isFalseAlarm ||
        currentStatementCheck.isFakeStatement ||
        (isInvalidImg && !currentStatementCheck.isRealEmergency)
      );

      const isRequiresReview = Boolean(
        !isDigitalFake && (
          result?.isRequiresReview ||
          aiClassification?.status === "REQUIRES_REVIEW" ||
          (isInvalidImg && currentStatementCheck.isRealEmergency)
        )
      );

      const assignedStatus = isDigitalFake ? "REJECTED" : (result?.status || (isRequiresReview ? "REQUIRES_REVIEW" : (isFalse ? "REJECTED" : "Pending")));
      const calculatedScore = (isDigitalFake || isFalse) ? 0.0 : (isRequiresReview ? 1.0 : (result?.priorityScore != null ? result.priorityScore : 7.5));
      const calculatedSeverity = (isDigitalFake || isFalse) ? "False Alarm" : (isRequiresReview ? "Requires Review" : (result?.severity || "High"));

      const defaultReason = isDigitalFake
        ? "Classified as Digital Fake / Spoof: This image was detected as a downloaded web photo, AI synthetic image, or a photo taken of a digital screen rather than an authentic on-site emergency."
        : isInvalidImg
        ? "Image does not appear to match a disaster emergency. Please upload a valid incident photo or provide a detailed text description."
        : (isFalse ? "Classified as False Alarm: Non-emergency report." : "Verified genuine disaster emergency.");

      setSubmittedReceipt({
        incidentId: incidentIdFormatted,
        title: finalTitle,
        category: currentCategoryLabel,
        peopleCount,
        hasMedicalEmergency,
        medicalDetails,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        photoUrl: safePhoto,
        audioUrl: voiceAudioUrl,
        audioBase64: null,
        audioBlob: voiceAudioBlob,
        voiceTranscript,
        isOffline: !isOnline,
        isFalseAlarm: isFalse,
        isDigitalFake,
        isRequiresReview,
        isInvalidImage: isInvalidImg,
        status: assignedStatus,
        priorityScore: calculatedScore,
        severity: calculatedSeverity,
        verificationReason: result?.verificationReason || aiClassification?.verificationReason || currentStatementCheck.reason || defaultReason,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });

      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt / Confirmation Success Screen
  if (submittedReceipt) {
    const isDigitalFake = Boolean(submittedReceipt.isDigitalFake);
    const isFalse = Boolean(submittedReceipt.isFalseAlarm);
    const isRequiresReview = Boolean(submittedReceipt.isRequiresReview);
    const isInvalidImg = Boolean(submittedReceipt.isInvalidImage);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5 text-center shadow-sm">
        <div className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border mb-3 ${
            isDigitalFake
              ? "bg-red-50 text-red-600 border-red-300 ring-4 ring-red-50"
              : isFalse
              ? "bg-amber-50 text-amber-600 border-amber-300 ring-4 ring-amber-50"
              : isRequiresReview
              ? "bg-blue-50 text-blue-600 border-blue-300 ring-4 ring-blue-50"
              : "bg-green-50 text-green-600 border-green-200 ring-4 ring-green-50"
          }`}>
            {isDigitalFake || isFalse || isRequiresReview ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isDigitalFake
                ? "bg-red-100 text-red-900 border-red-300"
                : isFalse
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : isRequiresReview
                ? "bg-blue-100 text-blue-900 border-blue-300"
                : "bg-green-100 text-green-900 border-green-300"
            }`}>
              {isDigitalFake
                ? "⚠️ Digital Fake / Spoof Detected (Score: 0.0)"
                : isFalse
                ? "⚠️ False Alarm / Rejected (Score: 0.0)"
                : isRequiresReview
                ? "🔍 Requires Review / Image Verification Failed (Score: 1.0)"
                : "✓ Verified Genuine Emergency Report"}
            </span>

            <h2 className="text-2xl font-bold text-slate-900 pt-1">
              {isDigitalFake
                ? "Report Logged — Rejected as Digital Fake / Spoof"
                : isFalse
                ? "Report Logged — Marked as False Alarm / Rejected"
                : isRequiresReview
                ? "Report Logged — Requires Review"
                : (t.reportSubmittedTitle || "Report Submitted Successfully")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mt-1 mx-auto">
              {isDigitalFake
                ? "Our anti-spoofing vision engine detected this as a downloaded web image, AI-generated synthetic picture, or photo of a digital screen. Priority Score is strictly 0.0/10."
                : isInvalidImg
                ? "Image does not appear to match a disaster emergency. Please upload a valid incident photo or provide a detailed text description."
                : isFalse
                ? "Our automated AI authenticity engine evaluated this statement/image and flagged it as a false alarm. Priority Score is 0.0/10."
                : (t.reportSubmittedDesc || "Your emergency alert has been verified and transmitted to the rescue command center.")}
            </p>
          </div>

          <div className="mt-3 px-3.5 py-1 rounded-md bg-slate-100 border border-slate-200 inline-flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">{t.incidentIdLabel || "Incident ID"}:</span>
            <span className="font-bold text-xs text-slate-900 font-mono">
              {submittedReceipt.incidentId}
            </span>
          </div>
        </div>

        {/* Prominent Verification & Priority Banner */}
        <div className={`p-4 rounded-xl text-left border space-y-2.5 ${
          isFalse
            ? "bg-amber-50 border-amber-300 text-amber-900"
            : isRequiresReview
            ? "bg-blue-50 border-blue-300 text-blue-900"
            : "bg-blue-50 border-blue-200 text-blue-900"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              {isFalse || isRequiresReview ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <ShieldCheck className="w-4 h-4 text-blue-600" />}
              <span>
                {isFalse
                  ? "Status: REJECTED"
                  : isRequiresReview
                  ? "Status: REQUIRES REVIEW"
                  : "Priority Score & Operational Triage"}
              </span>
            </span>
            <div className={`px-2.5 py-1 rounded-lg font-mono font-bold text-sm border ${
              isFalse
                ? "bg-white text-slate-800 border-amber-300"
                : "bg-white text-blue-700 border-blue-300"
            }`}>
              Score: {submittedReceipt.priorityScore}/10
            </div>
          </div>

          <p className="text-xs leading-relaxed font-medium">
            {submittedReceipt.verificationReason || defaultReason}
          </p>

          <div className="text-[11px] pt-1 border-t border-current/20 flex items-center justify-between font-semibold">
            <span>Operational Status & Severity:</span>
            <span className={isFalse ? "text-amber-800 font-mono font-bold" : "text-blue-800 font-mono font-bold"}>
              {submittedReceipt.status} ({submittedReceipt.severity})
            </span>
          </div>
        </div>

        {/* Structured Summary Rows */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left divide-y divide-slate-200 space-y-2">
          <div className="flex items-start justify-between pb-2 text-xs gap-3">
            <span className="text-slate-600 font-medium shrink-0">{t.titleLabel || "Incident Title"}:</span>
            <span className="font-bold text-slate-900 text-right truncate max-w-[220px]">
              {submittedReceipt.title}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-600 font-medium">{t.categorySummary || "Incident Type"}:</span>
            <span className="font-bold text-slate-900">{submittedReceipt.category}</span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-600 font-medium">{t.peopleCountSummary || "People Affected"}:</span>
            <span className="font-bold text-slate-900">{submittedReceipt.peopleCount}</span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-600 font-medium">{t.medicalCheckbox || "Medical Emergency"}:</span>
            <span className={`font-bold ${submittedReceipt.hasMedicalEmergency ? "text-red-600" : "text-slate-600"}`}>
              {submittedReceipt.hasMedicalEmergency ? "Yes — Assistance Flagged" : "None Reported"}
            </span>
          </div>

          <div className="flex items-start justify-between py-2 text-xs gap-3">
            <span className="text-slate-600 font-medium shrink-0">{t.locationSummary || "Location"}:</span>
            <span className="font-semibold text-slate-800 text-right truncate max-w-[220px]">
              {submittedReceipt.address}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-600 font-medium">{t.statusLabel || "Status"}:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${isFalse ? "text-amber-700" : "text-green-700"}`}>
              <span className={`w-2 h-2 rounded-full ${isFalse ? "bg-amber-500" : "bg-green-600"}`} />
              {isFalse
                ? "Deprioritized (Score 0.0) — Retained for Command Audit"
                : (submittedReceipt.isOffline ? "Saved Locally (Will auto-sync)" : "Sent to Rescue Dashboard")}
            </span>
          </div>

          {submittedReceipt.photoUrl && (
            <div className="pt-2 text-left space-y-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                {submittedReceipt.isOffline ? "📸 Field Photo (Stored Offline):" : "📸 Field Photo Attached:"}
              </span>
              <img
                src={submittedReceipt.photoUrl}
                alt="Captured Incident"
                className="w-full h-32 object-cover rounded-lg border border-slate-200"
              />
            </div>
          )}

          {(submittedReceipt.audioUrl || submittedReceipt.audioBase64) && (
            <div className="pt-2 text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 block">
                  {submittedReceipt.isOffline ? "🎙️ Voice Audio Note (Stored Offline):" : "🎙️ Recorded Voice Distress Note:"}
                </span>
                <a
                  href={getPlayableAudioUrl(submittedReceipt.audioUrl || submittedReceipt.audioBase64)}
                  download={`receipt_${submittedReceipt.incidentId}_audio.webm`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-[10px] font-semibold"
                >
                  Open Audio ↗
                </a>
              </div>
              <audio
                src={getPlayableAudioUrl(submittedReceipt.audioUrl || submittedReceipt.audioBase64)}
                controls
                preload="metadata"
                className="w-full h-8 rounded"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="py-2.5 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {t.submitAnother || "Submit Another Report"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onViewReportStatus) {
                onViewReportStatus(submittedReceipt?.incidentId);
              }
            }}
            className="py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t.trackReportStatus || "Track Report Status"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Incident Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {t.categoryLabel || "Incident Type"}
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {categories.map((cat) => {
            if (cat.id === "other" && category === "other") {
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg border text-left transition-all bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-xs ring-1 ring-blue-600/30 min-h-[46px]"
                >
                  <div className="shrink-0">{cat.icon}</div>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder={t.other || "Type disaster..."}
                    maxLength={50}
                    autoFocus
                    className="w-full bg-transparent text-xs font-semibold text-blue-900 placeholder:text-blue-500/70 focus:outline-none p-0 border-none truncate"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg border text-left transition-all min-h-[46px] ${
                  category === cat.id
                    ? "bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-xs ring-1 ring-blue-600/30"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="shrink-0">{cat.icon}</div>
                <span className="text-xs truncate">
                  {cat.id === "other" && customCategory.trim() ? customCategory : cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom "Other" Incident Type text input */}
        {category === "other" && (
          <div className="mt-2.5 p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                <MoreHorizontal className="w-3.5 h-3.5 text-purple-600" />
                <span>{t.otherCategoryLabel || "Specify Incident Type"}</span>
                <span className="text-purple-700 font-semibold lowercase text-[10px] bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded">
                  required
                </span>
              </label>
              <span className="text-[11px] text-purple-600 font-mono">
                {customCategory.length}/60
              </span>
            </div>
            <input
              type="text"
              maxLength={60}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder={t.otherPlaceholder || "E.g., Gas leak, Chemical spill, Landslide, Severe Hailstorm..."}
              className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors shadow-xs"
              autoFocus
            />
            <p className="text-[11px] text-purple-700">
              Type the specific emergency or disaster so first responders and rescue triage understand the exact hazard.
            </p>
          </div>
        )}
      </div>

      {/* 2. Incident Title / Headline (User Given) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <span>{t.titleLabel || "Incident Title / Emergency Headline"}</span>
            <span className="text-blue-600 font-semibold lowercase text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
              {t.customTitleHelp || "user specified"}
            </span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {title.length}/100
          </span>
        </div>
        <input
          type="text"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            category === "flood"
              ? "E.g., Senior Care Home Ground Floor Inundated - Urgent Evacuation Needed"
              : category === "earthquake"
              ? "E.g., Severe Tremor Caused Partial Masonry Collapse - People Trapped"
              : category === "tsunami"
              ? "E.g., High-Velocity Coastal Surge Overtopping Sea Wall - Evacuating Inland"
              : category === "trapped"
              ? "E.g., 6 Family Members Stranded on 2nd Floor Roof Terrace"
              : category === "medical"
              ? "E.g., Cardiac Patient in Flooded House Needing Immediate Ambulance"
              : category === "fire"
              ? "E.g., High-Voltage Transformer Fire Sparking Near Flooded Street"
              : category === "bridge"
              ? "E.g., Arterial Canal Overpass Fracture Blocking Ambulance Route"
              : category === "other"
              ? (customCategory.trim() ? `E.g., Urgent ${customCategory.trim()} Alert - Immediate Assistance Requested` : "E.g., Urgent Specialized Incident - Immediate Assistance Requested")
              : "E.g., Urgent Distress Headline"
          }
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-xs"
        />
        <p className="text-[11px] text-slate-500">
          {t.titleHint || "Provide a clear headline. Rescue teams and dispatchers see this title first on the live incident board."}
        </p>
      </div>

      {/* 3. Photo / Camera */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {t.photoLabel || "Photo / Camera"}
        </label>
        <PhotoCaptureModal
          photoUrl={photoUrl}
          setPhotoUrl={setPhotoUrl}
          aiClassification={aiClassification}
          setAiClassification={setAiClassification}
          category={category === "other" && customCategory.trim() ? customCategory.trim() : category}
          hasMedical={hasMedicalEmergency}
          title={title}
          description={description}
          voiceTranscript={voiceTranscript}
        />
      </div>

      {/* 4. Voice Report */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {t.voiceLabel || "Voice Report"}
        </label>
        <VoiceRecorderModal
          voiceTranscript={voiceTranscript}
          setVoiceTranscript={setVoiceTranscript}
          audioUrl={voiceAudioUrl}
          setAudioUrl={setVoiceAudioUrl}
          audioBase64={voiceAudioBase64}
          setAudioBase64={setVoiceAudioBase64}
          setAudioBlob={setVoiceAudioBlob}
          category={category}
        />
      </div>

      {/* 5. Text Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {t.descriptionLabel || "Text Description"}
          </label>
          <span className="text-[11px] text-slate-500 font-mono">
            {description.length} / 500 {t.charLimit || "characters"}
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.descriptionPlaceholder || "Describe landmarks, water depth, building color, phone number or urgent needs..."}
          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 leading-relaxed resize-none"
        />

        {currentStatementCheck.isFakeStatement && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">⚠️ AI Authenticity Alert: </span>
              {currentStatementCheck.reason}
              <p className="text-[10px] text-amber-700 font-normal mt-0.5">
                Notice: Submissions with false statements are automatically scored 0.0/10 (False Alarm).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 6. People Affected */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-900 block">
            {t.peopleAffectedLabel || "People Affected"}
          </label>
          <p className="text-[11px] text-slate-500">Number of people stranded or needing help</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
            className="w-8 h-8 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 flex items-center justify-center text-sm transition-colors"
          >
            -
          </button>
          <span className="w-8 text-center font-bold text-sm text-slate-900">
            {peopleCount}
          </span>
          <button
            type="button"
            onClick={() => setPeopleCount(peopleCount + 1)}
            className="w-8 h-8 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 flex items-center justify-center text-sm transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* 7. Medical Emergency */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasMedicalEmergency}
            onChange={(e) => setHasMedicalEmergency(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-red-600 rounded cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900">
              {t.medicalCheckbox || "Medical Emergency Assistance Required"}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Check this if someone is injured, unconscious, elderly, pregnant, or has chronic illness.
            </p>
          </div>
        </label>

        {hasMedicalEmergency && (
          <input
            type="text"
            value={medicalDetails}
            onChange={(e) => setMedicalDetails(e.target.value)}
            placeholder={t.medicalPlaceholder || "E.g., elderly diabetic person, oxygen needed, severe bleeding..."}
            className="w-full bg-slate-50 border border-red-300 rounded-md p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
          />
        )}
      </div>

      {/* 8. Current Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {t.locationLabel || "Current Location"}
        </label>
        <LocationPicker
          location={location}
          setLocation={setLocation}
          isLocationPermitted={isLocationPermitted}
          setIsLocationPermitted={setIsLocationPermitted}
          onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
        />
      </div>

      {/* Location Access Required Notice Banner */}
      {!isLocationPermitted && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-2.5 text-xs text-red-900 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <MapPinOff className="w-4 h-4 text-red-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block text-red-950 truncate">
                Location Access Required
              </span>
              <span className="text-[11px] text-red-700 block truncate">
                You cannot submit an emergency report without location access
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPermissionModalOpen(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            Turn On
          </button>
        </div>
      )}

      {/* 9. Submit Report Button */}
      <button
        type="submit"
        disabled={isSubmitting || !isLocationPermitted}
        onClick={(e) => {
          if (!isLocationPermitted) {
            e.preventDefault();
            setIsPermissionModalOpen(true);
            if (addToast) {
              addToast({
                type: "error",
                title: "Location Access Required",
                message: "You cannot submit an emergency report without location access."
              });
            }
          }
        }}
        className={`w-full py-3 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
          !isLocationPermitted
            ? "bg-slate-200 text-slate-400 border-2 border-slate-300 shadow-none cursor-not-allowed"
            : !isOnline
            ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        }`}
      >
        {!isLocationPermitted ? (
          <>
            <MapPinOff className="w-4 h-4 text-slate-400" />
            <span>Location Access Required to Submit</span>
          </>
        ) : !isOnline ? (
          <>
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? (t.submitting || "Saving Report...") : (t.submitReport || "Save Report Offline")}</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? (t.submitting || "Submitting Report...") : (t.submitReport || "Submit Report")}</span>
          </>
        )}
      </button>

      {/* Location Permission Guidance Modal Pop-up */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onRetry={() => checkAndAutoDetectLocation(true)}
        isRetrying={isCheckingLocation}
      />
    </form>
  );
};


