import React from 'react';
import { Pill, Clock, AlertTriangle, Droplets, SunMedium } from 'lucide-react';

export default function MedicineCard({ medicine, isBackup = false, title = "Recommended Medicine" }) {
  if (!medicine) return null;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isBackup 
        ? 'bg-amber-950/20 border-amber-600/40 text-amber-100' 
        : 'bg-[#142318] border-forest-500/40 text-cream-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 ${isBackup ? 'bg-amber-500/20 text-amber-300' : 'bg-forest-600/30 text-forest-300'}`}>
            <Pill className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block truncate">
              {isBackup ? "Alternative Medicine (Switched)" : title}
            </span>
            <h4 className="text-sm font-bold text-white tracking-tight truncate">{medicine.name}</h4>
          </div>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {medicine.dosage && (
          <div className="flex items-start gap-2 bg-surface-dark/60 p-2 rounded-xl border border-surface-border/60">
            <Droplets className="w-3.5 h-3.5 text-forest-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-surface-muted block">Dosage</span>
              <span className="font-semibold text-white">{medicine.dosage}</span>
            </div>
          </div>
        )}

        {medicine.spray_interval && (
          <div className="flex items-start gap-2 bg-surface-dark/60 p-2 rounded-xl border border-surface-border/60">
            <Clock className="w-3.5 h-3.5 text-forest-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-surface-muted block">Spray Interval</span>
              <span className="font-semibold text-white">{medicine.spray_interval}</span>
            </div>
          </div>
        )}

        {medicine.spray_time && (
          <div className="flex items-start gap-2 bg-surface-dark/60 p-2 rounded-xl border border-surface-border/60">
            <SunMedium className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-surface-muted block">Best Timing</span>
              <span className="font-semibold text-white">{medicine.spray_time}</span>
            </div>
          </div>
        )}

        {medicine.precautions && (
          <div className="flex items-start gap-2 bg-surface-dark/60 p-2 rounded-xl border border-surface-border/60">
            <AlertTriangle className="w-3.5 h-3.5 text-alert-yellow mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-surface-muted block">Precautions</span>
              <span className="font-medium text-cream-200 text-[11px] leading-tight">{medicine.precautions}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
