import React, { useState } from "react";
import { CitizenProvider, useCitizenEmergency } from "./context/CitizenContext";
import { CitizenNavbar } from "./components/common/CitizenNavbar";
import { ToastContainer } from "./components/common/ToastContainer";
import { CitizenPortal } from "./components/citizen/CitizenPortal";
import { ShieldAlert, Radio, FileText, BookOpen, AlertOctagon } from "lucide-react";

const CitizenAppContent = () => {
  const { t } = useCitizenEmergency();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#1F2937] selection:bg-blue-600 selection:text-white">
      {/* Global Citizen Header */}
      <CitizenNavbar onOpenMyReports={() => setIsDrawerOpen(true)} />

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Main Content Body - Dedicated Citizen Emergency Portal */}
      <main className="flex-1">
        <CitizenPortal
          isDrawerOpen={isDrawerOpen}
          setIsDrawerOpen={setIsDrawerOpen}
        />
      </main>

      {/* Mobile Fixed Bottom Quick Action Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-md">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-blue-700"
        >
          <Radio className="w-5 h-5" />
          <span>{t.reportAnEmergency || "Report"}</span>
        </button>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
        >
          <FileText className="w-5 h-5" />
          <span>{t.myReports || "My Reports"}</span>
        </button>
      </nav>

      {/* Citizen Platform Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-xs text-slate-500 hidden sm:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">{t.appName || "JEEVA"}</span>
            <span>• Citizen Emergency Reporting & SOS System</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 text-xs">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="hover:text-blue-600 transition-colors"
            >
              {t.myReports || "My Reports"}
            </button>
            <a
              href="tel:112"
              className="text-red-600 hover:underline font-semibold"
            >
              Emergency Helpline 112
            </a>
          </div>

          <p className="text-[11px] text-slate-400">
            Rapid Disaster Field Response • Coordinates shared with Emergency Command
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CitizenProvider>
      <CitizenAppContent />
    </CitizenProvider>
  );
}
