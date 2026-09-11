import React, { useState } from "react";
import { useCitizenEmergency } from "../../context/CitizenContext";
import { QuickSOSButton } from "./QuickSOSButton";
import { EmergencyReportForm } from "./EmergencyReportForm";
import { OfflineSyncBanner } from "./OfflineSyncBanner";
import { SurvivalGuideModal } from "./SurvivalGuideModal";
import { MyReportsDrawer } from "./MyReportsDrawer";
import {
  FileText,
  BookOpen,
  PhoneCall,
  Radio,
  Clock,
  AlertOctagon,
  ArrowRight
} from "lucide-react";

export const CitizenPortal = ({
  isDrawerOpen: externalDrawerOpen,
  setIsDrawerOpen: externalSetDrawerOpen,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}) => {
  const { myReports, t } = useCitizenEmergency();
  // Landing page opens with the SOS button by default; Report an Emergency is second
  const [internalActiveTab, setInternalActiveTab] = useState("sos");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalDrawerOpen;
  const setIsDrawerOpen = externalSetDrawerOpen || setInternalDrawerOpen;
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 pb-24 space-y-4">
      {/* Offline Alert & Pending Sync Banner */}
      <OfflineSyncBanner />

      {/* Mode Switcher Tabs: 1st Option = SOS Button, 2nd Option = Report an Emergency */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        {/* 1st Option: SOS Button */}
        <button
          onClick={() => setActiveTab("sos")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "sos"
              ? "bg-red-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
          <span>{t.quickSosBeacon || "Quick SOS Beacon"}</span>
        </button>

        {/* 2nd Option: Report an Emergency */}
        <button
          onClick={() => setActiveTab("form")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "form"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.reportAnEmergency || "Report an Emergency"}</span>
        </button>
      </div>

      {/* Main Tab Content Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
        {activeTab === "sos" ? (
          <div className="space-y-6 py-2">
            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                Immediate Assistance
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {t.oneTouchSos || "One-Touch Emergency SOS"}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t.oneTouchSosDesc || "Press and hold to immediately broadcast your GPS coordinates to rescue teams."}
              </p>
            </div>

            <QuickSOSButton />

            {/* Quick Switch to Detailed Emergency Reporting */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <span>{t.reportAnEmergency || "Report an Emergency with Details & Photo"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Helpline Numbers */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-center text-xs">
              <a
                href="tel:112"
                className="flex items-center gap-1 text-slate-700 hover:text-red-600 font-semibold"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                <span>112 (National SOS)</span>
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="tel:108"
                className="flex items-center gap-1 text-slate-700 hover:text-red-600 font-semibold"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                <span>108 (Ambulance)</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t.reportAnEmergency || "Report an Emergency"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.reportAnEmergencyDesc || "Fill in the details below to dispatch immediate rescue assistance to your location."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("sos")}
                className="shrink-0 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                title="Switch to One-Touch SOS Beacon"
              >
                <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.sosButton || "SOS"}</span>
              </button>
            </div>

            <EmergencyReportForm onViewReportStatus={() => setIsDrawerOpen(true)} />
          </div>
        )}
      </div>

      {/* Citizen Utility Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-colors flex items-center gap-3 shadow-xs"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{t.myReports || "My Reports"}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {myReports.length} {t.submittedReportsCount || "submitted report(s)"}
            </p>
          </div>
        </button>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-colors flex items-center gap-3 shadow-xs"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{t.survivalGuide || "Survival Guide"}</p>
            <p className="text-[11px] text-slate-500 truncate">{t.survivalGuideDesc || "Offline disaster tips"}</p>
          </div>
        </button>
      </div>

      {/* Modals & Drawers */}
      <SurvivalGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <MyReportsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

