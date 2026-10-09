import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, Camera, Repeat, CheckCircle2, AlertTriangle, 
  ArrowRight, Calendar, Search, Sparkles, Clock, Droplets, ChevronDown, ChevronUp,
  FileCheck, ShieldCheck
} from 'lucide-react';
import { getTreatments, getScanHistory } from '../api/client';
import DamageBar from '../components/DamageBar';

export default function History({ onNavigate, t, onSelectTreatment }) {
  const [activeTab, setActiveTab] = useState('treatments'); // 'treatments' | 'scans'
  const [treatments, setTreatments] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [treatmentsData, scansData] = await Promise.all([
        getTreatments().catch(() => []),
        getScanHistory().catch(() => [])
      ]);
      setTreatments(Array.isArray(treatmentsData) ? treatmentsData : []);
      setScans(Array.isArray(scansData) ? scansData : []);
    } catch (e) {
      console.warn("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filtered treatments
  const filteredTreatments = treatments.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.plant_name || '').toLowerCase().includes(q) ||
      (p.disease_name || '').toLowerCase().includes(q) ||
      (p.current_medicine || '').toLowerCase().includes(q)
    );
  });

  // Filtered scans
  const filteredScans = scans.filter((s) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.plant_name || '').toLowerCase().includes(q) ||
      (s.disease_name || '').toLowerCase().includes(q) ||
      (s.medicine_name || '').toLowerCase().includes(q)
    );
  });

  const archivedTreatmentsCount = treatments.filter(p => p.status === 'ARCHIVED' || p.status === 'RECOVERED').length;

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12 space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-forest-900/80 border border-forest-500/40 flex items-center justify-center text-forest-300 shrink-0">
              <HistoryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span>{t.history || 'Case History & Archives'}</span>
          </h1>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plant or disease..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white placeholder-surface-muted focus:outline-none focus:border-forest-400"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        <button
          onClick={() => setActiveTab('treatments')}
          className={`flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
            activeTab === 'treatments'
              ? 'bg-forest text-white shadow-md glow-green'
              : 'bg-surface-card border border-surface-border text-surface-muted hover:text-white'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Treatment Loops</span>
          <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px]">
            {treatments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('scans')}
          className={`flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
            activeTab === 'scans'
              ? 'bg-forest text-white shadow-md glow-green'
              : 'bg-surface-card border border-surface-border text-surface-muted hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Scan Diagnoses</span>
          <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px]">
            {scans.length}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-forest-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-surface-muted">Loading your past farm records...</p>
        </div>
      ) : activeTab === 'treatments' ? (
        /* ================= TAB 1: TREATMENT LOOPS ================= */
        <div className="space-y-4">
          {filteredTreatments.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface-card border border-surface-border text-center">
              <Repeat className="w-12 h-12 text-surface-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-white mb-1">No Treatment Records Found</h3>
              <p className="text-xs text-surface-muted max-w-sm mx-auto mb-4">
                {searchTerm
                  ? 'No treatment plans matched your search term.'
                  : 'Start a treatment plan from the "Scan Plant" page to track multi-day crop healing.'}
              </p>
              <button
                onClick={() => onNavigate('scan')}
                className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold transition-all shadow-md"
              >
                Scan Plant to Start
              </button>
            </div>
          ) : (
            filteredTreatments.map((plan) => {
              const isRecovered = plan.status === 'RECOVERED' || plan.latest_damage === 0;
              const isArchived = plan.status === 'ARCHIVED';
              const isStopped = plan.status === 'STOPPED_INEFFECTIVE';
              const isExpanded = expandedPlanId === plan.id;
              const checkins = plan.checkins || [];

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden transition-all hover:border-forest-500/40 shadow-sm"
                >
                  {/* Card Header / Summary */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-white">
                          {plan.plant_name} — {plan.disease_name}
                        </h2>

                        {/* Status Badge */}
                        {isRecovered && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Cured (0% Damage) 🎉
                          </span>
                        )}
                        {isArchived && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-forest-950 border border-forest-500/40 text-forest-300 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            Archived Case
                          </span>
                        )}
                        {isStopped && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 border border-red-500/40 text-red-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Doctor Consulted
                          </span>
                        )}
                        {!isRecovered && !isArchived && !isStopped && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                            Active Loop
                          </span>
                        )}

                        <span className="text-[11px] text-surface-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(plan.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-surface-muted flex-wrap">
                        <span>
                          Medicine: <strong className="text-cream-200">{plan.current_medicine}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Check-ins: <strong className="text-white">{checkins.length} stages</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Damage: <strong className="text-amber-300">{plan.initial_damage}%</strong> → <strong className="text-emerald-400">{plan.latest_damage}%</strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-surface-border/50 justify-between md:justify-end shrink-0">
                      <button
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        className="flex-1 md:flex-none justify-center px-3 py-1.5 rounded-xl bg-surface-dark border border-surface-border text-surface-muted hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                      >
                        <span>{isExpanded ? "Hide Stages" : "View Stages"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (onSelectTreatment) onSelectTreatment(plan.id);
                          onNavigate('treatment');
                        }}
                        className="flex-1 md:flex-none justify-center px-3.5 py-1.5 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm active:scale-95"
                      >
                        <span>Open Loop</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Stages Timeline */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-surface-dark/70 border-t border-surface-border space-y-4 animate-in fade-in duration-150">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                        Recovery Stages Timeline ({checkins.length} Check-ins)
                      </h4>

                      {checkins.length === 0 ? (
                        <p className="text-xs text-surface-muted">No check-in photographs logged for this plan yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                          {checkins.map((chk, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-xl bg-surface-card border border-surface-border/60 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-white px-2 py-0.5 rounded-md bg-forest-950 border border-forest-500/30 text-[10px]">
                                  Day {chk.day_number}
                                </span>
                                <span className="font-bold text-emerald-400 text-xs">
                                  {chk.damage_percent}% Damage
                                </span>
                              </div>

                              {/* Thumbnail Photo */}
                              <div className="w-full h-32 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center border border-surface-border/40">
                                {chk.image_url ? (
                                  <img
                                    src={chk.image_url}
                                    alt={`Day ${chk.day_number}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Camera className="w-6 h-6 text-surface-muted" />
                                )}
                              </div>

                              <div className="text-[11px] space-y-1">
                                <p className="text-surface-muted">
                                  <strong>Medicine:</strong> <span className="text-cream-100">{chk.medicine_prescribed}</span>
                                </p>
                                {chk.status_message && (
                                  <p className="text-stone-300 text-[10px] line-clamp-2">
                                    {chk.status_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= TAB 2: PAST SCANS ================= */
        <div className="space-y-4">
          {filteredScans.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface-card border border-surface-border text-center">
              <Camera className="w-12 h-12 text-surface-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-white mb-1">No Past Scans Found</h3>
              <p className="text-xs text-surface-muted max-w-sm mx-auto mb-4">
                {searchTerm
                  ? 'No scan records matched your search.'
                  : 'Take a photo of any crop leaf with disease symptoms in "Scan Plant" to log diagnoses.'}
              </p>
              <button
                onClick={() => onNavigate('scan')}
                className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold transition-all shadow-md"
              >
                Scan Your First Leaf
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScans.map((scan) => (
                <div
                  key={scan.id}
                  className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden hover:border-forest-500/40 transition-all shadow-sm flex flex-col"
                >
                  <div className="relative w-full h-44 bg-black/40 overflow-hidden flex items-center justify-center">
                    {scan.image_url ? (
                      <img
                        src={scan.image_url}
                        alt={scan.plant_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-surface-muted" />
                    )}

                    <span className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md border ${
                      scan.is_healthy
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-950/90 text-red-300 border-red-500/40'
                    }`}>
                      {scan.is_healthy ? "Healthy" : `${scan.damage_percent}% Damage`}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-surface-muted mb-1">
                        <span className="font-semibold text-forest-300">{scan.plant_name}</span>
                        <span>{formatDate(scan.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {scan.disease_name}
                      </h4>
                      {scan.medicine_name && (
                        <p className="text-xs text-surface-muted mt-1">
                          Rec: <span className="text-cream-200 font-medium">{scan.medicine_name}</span>
                        </p>
                      )}
                    </div>

                    {!scan.is_healthy && (
                      <button
                        onClick={() => onNavigate('scan')}
                        className="w-full py-2 rounded-xl bg-surface-dark hover:bg-forest-950 border border-surface-border text-stone-200 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Repeat className="w-3.5 h-3.5 text-forest-300" />
                        <span>Manage Treatment</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
