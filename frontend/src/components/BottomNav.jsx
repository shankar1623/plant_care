import React from 'react';
import { Home, Camera, Repeat, ShieldAlert, History } from 'lucide-react';

export default function BottomNav({ activePage, onNavigate, t, outbreakCount = 0 }) {
  const items = [
    { id: 'dashboard', label: t.dashboard, icon: Home },
    { id: 'scan', label: t.scan_plant, icon: Camera },
    { id: 'treatment', label: t.treatment_loop, icon: Repeat },
    { id: 'outbreak', label: t.outbreak_radar, icon: ShieldAlert, badge: outbreakCount },
    { id: 'history', label: t.history || 'History', icon: History },
  ];

  return (
    <div className="theme-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e1711]/95 backdrop-blur-lg border-t border-surface-border px-1 py-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 relative px-1 sm:px-2 py-1 rounded-xl transition-all flex-1 max-w-[76px] active:scale-95 ${
                isActive ? 'text-forest-300 font-semibold' : 'text-surface-muted hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-forest-400 scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-alert-red text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] xs:text-[10px] tracking-tight truncate max-w-[68px] text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
