import React, { useState } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { SAMPLE_DISASTER_IMAGES, mockAiClassifier, storageService } from "@jeeva/shared";
import { Camera, Image as ImageIcon, Sparkles, AlertTriangle, Check, RefreshCw, X } from "lucide-react";

export const PhotoCaptureModal = ({
  photoUrl,
  setPhotoUrl,
  aiClassification,
  setAiClassification,
  category,
  hasMedical,
  title = "",
  description = "",
  voiceTranscript = ""
}) => {
  const { t } = useCitizenEmergency();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectSample = async (sample) => {
    setIsAnalyzing(true);
    setShowPicker(false);

    try {
      // Try fetching and converting to base64 so it persists offline without internet
      try {
        const response = await fetch(sample.url);
        if (response.ok) {
          const blob = await response.blob();
          const compressed = await storageService.compressImageFile(blob, 640, 640, 0.65);
          setPhotoUrl(compressed || sample.url);
        } else {
          setPhotoUrl(sample.url);
        }
      } catch (fetchErr) {
        setPhotoUrl(sample.url);
      }

      const result = await mockAiClassifier.classifyDisasterImage(sample.url, sample.category, hasMedical, {
        fileName: sample.id,
        sampleId: sample.id,
        label: sample.label,
        isDigitalFake: sample.isDigitalFake,
        title,
        description,
        voiceTranscript
      });
      setAiClassification(result);
    } catch (err) {
      console.error("AI inference error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so taking another photo with the camera always triggers onChange
    e.target.value = "";

    setIsAnalyzing(true);
    try {
      // Safe immediate preview using object URL to prevent broken image icon while compressing
      const previewUrl = URL.createObjectURL(file);
      setPhotoUrl(previewUrl);

      const compressedDataUrl = await storageService.compressImageFile(file, 640, 640, 0.65);
      const finalUrl = compressedDataUrl || previewUrl;
      setPhotoUrl(finalUrl);

      const result = await mockAiClassifier.classifyDisasterImage(finalUrl, category, hasMedical, {
        fileName: file.name,
        name: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified,
        title,
        description,
        voiceTranscript
      });
      setAiClassification(result);
    } catch (err) {
      console.error("AI inference error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearPhoto = () => {
    setPhotoUrl(null);
    setAiClassification(null);
  };

  const getPriorityLevel = (cls) => {
    if (!cls) return "Standard";
    if (cls.isDigitalFake || cls.isFalseAlarm || cls.status === "REJECTED") return "Rejected";
    if (cls.status === "REQUIRES_REVIEW" || cls.isInvalidImage || cls.isValidDisaster === false) return "Requires Review";
    if (cls.priorityLevel) return cls.priorityLevel;
    const score = Number(cls.priorityScore ?? cls.hazardSeverity ?? 7.0);
    if (score >= 8.5) return "Critical";
    if (score >= 6.5) return "High";
    if (score >= 4.0) return "Medium";
    return "Low";
  };

  const isDigitalFake = Boolean(aiClassification?.isDigitalFake);

  const isFalseOrInvalid = Boolean(
    isDigitalFake ||
    aiClassification?.isFalseAlarm ||
    aiClassification?.isInvalidImage ||
    aiClassification?.isValidDisaster === false ||
    aiClassification?.status === "REJECTED" ||
    aiClassification?.status === "REQUIRES_REVIEW"
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-blue-600" />
          <span>{t.photoLabel || "Incident Photo & AI Analysis"}</span>
        </label>
        {photoUrl && (
          <button
            type="button"
            onClick={handleClearPhoto}
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {!photoUrl ? (
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* File Upload / Camera Trigger */}
            <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer text-xs font-medium text-slate-700 transition-colors">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>{t.takePhoto || "Take Photo / Upload"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Choose Disaster Preset Sample */}
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-teal-600" />
              <span>{t.pickScenario || "Pick Test Scenario"}</span>
            </button>
          </div>

          {/* Test Disaster Preset Gallery */}
          {showPicker && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 animate-fadeIn">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Select Realistic Incident Photo or Digital Fake Test:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_DISASTER_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg bg-white hover:bg-blue-50 border text-left transition-all hover:border-blue-300 ${
                      sample.isDigitalFake ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
                    }`}
                  >
                    <img
                      src={sample.url}
                      alt={sample.label}
                      className="w-12 h-12 rounded object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {sample.label}
                      </p>
                      <p className={`text-[10px] font-semibold capitalize ${
                        sample.isDigitalFake
                          ? "text-amber-800"
                          : sample.severity === 0
                          ? "text-amber-700"
                          : "text-red-600"
                      }`}>
                        {sample.isDigitalFake
                          ? "⚠️ Digital Spoof • Score: 0.0"
                          : sample.severity === 0
                          ? "⚠️ False Alarm • Score: 0.0"
                          : `${sample.category} • Severity: ${sample.severity}/10`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Image Preview & AI Inference Results */
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
            <img
              src={photoUrl}
              alt="Disaster Scene"
              className="w-full h-44 object-cover"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-slate-800">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-700">
                  Analyzing incident image & anti-spoofing checks...
                </span>
              </div>
            )}
          </div>

          {/* AI Vision Insights & False Alarm Verification Card */}
          {aiClassification && !isAnalyzing && (
            <div
              className={`border rounded-xl p-3 space-y-2.5 transition-all ${
                isDigitalFake
                  ? "bg-red-50/90 border-red-300 shadow-xs"
                  : isFalseOrInvalid
                  ? "bg-amber-50/90 border-amber-300 shadow-xs"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    isDigitalFake
                      ? "text-red-700"
                      : isFalseOrInvalid
                      ? "text-amber-800"
                      : "text-blue-700"
                  }`}
                >
                  {isDigitalFake ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>⚠️ Digital Spoof Detected</span>
                    </>
                  ) : isFalseOrInvalid ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{aiClassification.status === "REQUIRES_REVIEW" ? "⚠️ Needs Manual Review" : "⚠️ False Alarm Detected"}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>✓ Verified Disaster Image</span>
                    </>
                  )}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isDigitalFake || aiClassification.isFalseAlarm || aiClassification.status === "REJECTED"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : aiClassification.status === "REQUIRES_REVIEW" || aiClassification.isInvalidImage
                      ? "bg-blue-100 text-blue-900 border-blue-300"
                      : (aiClassification.priorityLevel === "Critical" || aiClassification.hazardSeverity >= 8.5)
                      ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  Priority Level: {getPriorityLevel(aiClassification)}
                </span>
              </div>

              {/* Verification Details */}
              <div className="space-y-1.5">
                {isFalseOrInvalid ? (
                  <div className={`p-3 rounded-xl border-2 text-xs space-y-2 ${
                    isDigitalFake
                      ? "bg-red-50/80 border-red-300"
                      : "bg-amber-50 border-amber-300"
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                        isDigitalFake ? "text-red-600" : "text-amber-600"
                      }`} />
                      <div className="space-y-1">
                        <p className={`font-bold text-xs leading-snug ${
                          isDigitalFake ? "text-red-950" : "text-amber-950"
                        }`}>
                          {isDigitalFake
                            ? "Digital Spoof Detected: Recycled photo, AI image, or screen capture identified."
                            : "Image does not appear to match a disaster emergency. Please upload a valid incident photo or provide a detailed text description."}
                        </p>
                        <p className={`text-[11px] ${
                          isDigitalFake ? "text-red-900" : "text-amber-800"
                        }`}>
                          {aiClassification.verificationReason}
                        </p>
                        <div className={`flex flex-wrap items-center gap-2 pt-1 text-[10px] font-semibold border-t ${
                          isDigitalFake ? "text-red-900 border-red-200" : "text-amber-900 border-amber-200"
                        }`}>
                          <span>Priority Level: <span className="font-mono px-1.5 py-0.5 rounded bg-white text-red-600 border border-current font-bold">{getPriorityLevel(aiClassification)}</span></span>
                          <span>Status: <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold">{aiClassification.status || "REJECTED"}</span></span>
                          <span>Score: <span className="font-mono px-1.5 py-0.5 rounded bg-white text-slate-800 border border-current font-bold">{aiClassification.priorityScore ?? 0}/10</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{aiClassification.detectedHazard}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Priority Level: <span className="font-bold text-red-600">{getPriorityLevel(aiClassification)}</span></span>
                      <span className="font-mono text-[10px] text-slate-500">Hazard Rating: {aiClassification.hazardSeverity}/10</span>
                    </p>
                  </>
                )}
              </div>

              {/* Visual Observation Tags */}
              {aiClassification.visualTags && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {aiClassification.visualTags.map((tag, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        isFalseOrInvalid
                          ? "bg-white text-amber-800 border-amber-200"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      {isFalseOrInvalid ? "⚠️" : "✓"} {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
