import React, { useState, useEffect } from "react";
import { CitizenProvider, useCitizenEmergency } from "./context/CitizenContext";
import { CitizenNavbar } from "./components/common/CitizenNavbar";
import { ToastContainer } from "./components/common/ToastContainer";
import { CitizenPortal } from "./components/citizen/CitizenPortal";
import { AIChatbox } from "./components/citizen/AIChatbox";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { NotFoundPage } from "./components/common/NotFoundPage";
import { ShieldAlert, Radio, FileText, BookOpen, AlertOctagon } from "lucide-react";

const CitizenAppContent = () => {
  const { t } = useCitizenEmergency();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Default to SOS landing page as requested
  const [activeTab, setActiveTab] = useState("sos");

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </main>

      {/* Mobile Fixed Bottom Quick Action Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-md">
        {/* 1st Option: SOS Button */}
        <button
          onClick={() => {
            setActiveTab("sos");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
            activeTab === "sos" ? "text-red-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
          <span>{t.sosButton || "SOS"}</span>
        </button>

        {/* 2nd Option: Report an Emergency */}
        <button
          onClick={() => {
            setActiveTab("form");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
            activeTab === "form" ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Radio className="w-5 h-5" />
          <span>{t.reportAnEmergency || "Report"}</span>
        </button>

        {/* 3rd Option: My Reports */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
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

      {/* Floating Gemini AI Emergency Intake Chatbox in Bottom-Right Corner */}
      <ErrorBoundary>
        <AIChatbox onOpenMyReports={() => setIsDrawerOpen(true)} />
      </ErrorBoundary>
    </div>
  );
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const normalizedPath = currentPath.replace(/\/+$/, "") || "/";
  const isHome = normalizedPath === "/" || normalizedPath === "/index.html";

  if (!isHome) {
    return (
      <NotFoundPage
        currentPath={currentPath}
        onNavigateHome={() => {
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }}
      />
    );
  }

  return (
    <CitizenProvider>
      <CitizenAppContent />
    </CitizenProvider>
  );
}
