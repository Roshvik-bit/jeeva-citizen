import React from "react";
import { BookOpen, PhoneCall, LifeBuoy, Activity, Flame, Wind, X } from "lucide-react";

export const SurvivalGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const helplines = [
    { title: "National Emergency Unified", number: "112", desc: "24/7 Police, Fire, Ambulance" },
    { title: "NDRF Disaster Helpline", number: "011-24363260", desc: "Specialist Search & Rescue" },
    { title: "Disaster Management Cell", number: "1070 / 1077", desc: "District Control Room" },
    { title: "Medical / Ambulance SOS", number: "108", desc: "Emergency Life Support" }
  ];

  const guides = [
    {
      icon: <LifeBuoy className="w-5 h-5 text-sky-400" />,
      title: "Flash Flood / Rising Water Protocol",
      steps: [
        "Immediately move to the highest floor or rooftop; take mobile phone, whistle, and power bank.",
        "Turn off the main electrical circuit breaker and gas valve before water enters.",
        "Never attempt to walk or drive through moving water above ankle height (6 inches can sweep an adult).",
        "Wave bright cloth or flash torchlight at rescue helicopters / motorized boats."
      ]
    },
    {
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      title: "Immediate CPR & Severe Bleeding Control",
      steps: [
        "Bleeding: Apply firm, continuous pressure directly over the wound using clean cloth or bandage.",
        "Unresponsive Victim: Check pulse. If absent, place hands center of chest, compress 2 inches deep at 100-120 bpm (beat of 'Stayin Alive').",
        "Keep hypothermic patients dry and insulated from cold ground using cardboard or plastic sheets."
      ]
    },
    {
      icon: <Wind className="w-5 h-5 text-amber-400" />,
      title: "Severe Cyclone & Building Collapse Safety",
      steps: [
        "Stay indoors away from glass windows; seek shelter in reinforced interior bathrooms or under heavy tables.",
        "If trapped under debris: Cover nose/mouth with cloth; tap on pipes or walls at regular intervals rather than shouting to preserve oxygen.",
        "Beware of fallen power lines in puddles; assume all downed cables are live."
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Offline Survival & First-Aid Manual</h3>
              <p className="text-[11px] text-slate-500">Available offline without internet connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Emergency Helplines */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>National Emergency Toll-Free Helplines</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {helplines.map((h, i) => (
                <a
                  key={i}
                  href={`tel:${h.number.split(" ")[0]}`}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 transition-colors group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {h.title}
                  </p>
                  <p className="text-sm font-mono font-bold text-red-600 mt-0.5">{h.number}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{h.desc}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Action Protocols */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Field Action Guidelines
            </h4>
            {guides.map((g, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  {g.icon}
                  <span className="text-xs font-bold text-slate-900">{g.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {g.steps.map((step, sIdx) => (
                    <li key={sIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
