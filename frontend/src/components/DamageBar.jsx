import React from 'react';

export default function DamageBar({ percent = 0, label = "Leaf Damage" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  
  // Determine color and severity
  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-400";
  let statusText = "Mild / Safe";

  if (clamped >= 35) {
    barColor = "bg-red-500";
    textColor = "text-red-400";
    statusText = "Severe Damage";
  } else if (clamped >= 15) {
    barColor = "bg-amber-500";
    textColor = "text-amber-400";
    statusText = "Moderate Damage";
  } else if (clamped === 0) {
    barColor = "bg-forest-400";
    textColor = "text-forest-300";
    statusText = "Healthy (0%)";
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
        <span className="text-surface-muted">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-dark border border-surface-border ${textColor}`}>
            {statusText}
          </span>
          <span className={`font-bold ${textColor}`}>{clamped.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full h-3 rounded-full bg-surface-dark border border-surface-border overflow-hidden p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
