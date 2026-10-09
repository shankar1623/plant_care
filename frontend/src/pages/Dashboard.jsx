import React, { useState, useEffect } from 'react';
import { Camera, Repeat, ShieldAlert, ArrowRight, CheckCircle2, AlertOctagon, TrendingDown, Clock, MapPin } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { getDashboardStats } from '../api/client';

export default function Dashboard({ onNavigate, t, onSelectTreatment, userLocation }) {
  const [stats, setStats] = useState({
    total_scans: 0,
    healthy_count: 0,
    diseased_count: 0,
    active_treatments_count: 0,
    outbreak_alerts_count: 0,
    top_outbreak: null,
    recent_treatments: []
  });
  const [loading, setLoading] = useState(true);

  // Clerk user
  let clerkUser = null;
  try {
    const { user } = useUser();
    clerkUser = user;
  } catch (e) {
    // Clerk not loaded yet or disabled
  }

  // Active user profile state (Ram vs Sai vs New User)
  const [activeUserId, setActiveUserId] = useState(() => {
    if (clerkUser?.id) return `clerk_${clerkUser.id}`;
    return localStorage.getItem('plantcare_user_id') || 'usr_ram';
  });

  const [userName, setUserName] = useState(() => {
    if (clerkUser?.firstName || clerkUser?.fullName) return clerkUser.firstName || clerkUser.fullName;
    return localStorage.getItem('plantcare_user_name') || 'Ram';
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat || 11.6643;
      const lon = userLocation?.lon || 78.1460;
      const data = await getDashboardStats(lat, lon);
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.warn("Could not fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeUserId, userLocation?.lat, userLocation?.lon]);

  const handleSwitchUser = (targetId, targetName) => {
    let finalId = targetId;
    let finalName = targetName;
    if (targetId === 'new') {
      finalId = `usr_new_${Date.now().toString(36)}`;
      finalName = 'New Farmer';
    }
    localStorage.setItem('plantcare_user_id', finalId);
    localStorage.setItem('plantcare_user_name', finalName);
    setActiveUserId(finalId);
    setUserName(finalName);
  };

  const isReturningUser = stats.total_scans > 0;
  const welcomeGreeting = isReturningUser
    ? `${t.welcome_back || 'Welcome back,'} ${userName}!`
    : `${t.welcome_new || 'Welcome,'} ${userName}!`;

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12">
      {/* Quick User Account Switcher (For local testing & multi-user outbreak verification) */}
      {!clerkUser && (
        <div className="mb-4 p-3 rounded-2xl bg-surface-card/60 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-surface-muted font-medium">
            <span className="shrink-0">👤 Active:</span>
            <span className="text-white font-bold bg-forest-900/60 text-forest-300 px-2.5 py-0.5 rounded-lg border border-forest-500/30 truncate max-w-[200px]">
              {userName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto -mx-1 px-1">
            <span className="text-[11px] text-surface-muted mr-1 shrink-0">Switch:</span>
            <button
              onClick={() => handleSwitchUser('usr_ram', 'Ram')}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                activeUserId === 'usr_ram'
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-surface-dark text-surface-muted hover:text-white'
              }`}
            >
              Ram
            </button>
            <button
              onClick={() => handleSwitchUser('usr_sai', 'Sai')}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                activeUserId === 'usr_sai'
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-surface-dark text-surface-muted hover:text-white'
              }`}
            >
              Sai
            </button>
            <button
              onClick={() => handleSwitchUser('usr_farmer3', 'Farmer 3')}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                activeUserId === 'usr_farmer3'
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-surface-dark text-surface-muted hover:text-white'
              }`}
            >
              Farmer 3
            </button>
            <button
              onClick={() => handleSwitchUser('new', 'New Farmer')}
              className="px-2.5 py-1 rounded-lg font-semibold shrink-0 bg-emerald-950 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900 transition-all"
            >
              + New
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
            {welcomeGreeting} 👋
          </h1>
          {userLocation && (
            <div className="flex items-center gap-1.5 text-xs text-forest-300 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[240px] sm:max-w-none">{(!userLocation.city || userLocation.city.toUpperCase().trim() === 'GPS' || userLocation.city.includes('GPS')) ? 'Katpadi, IN' : userLocation.city}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('scan')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 glow-green active:scale-95"
          >
            <Camera className="w-4 h-4" /> {t.scan_plant}
          </button>
        </div>
      </div>

      {/* 25 km Outbreak Banner Card */}
      {stats.top_outbreak && (
        <div 
          onClick={() => onNavigate('outbreak')}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-surface-card border border-alert-red/40 mb-6 cursor-pointer hover:border-alert-red transition-all group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/50 border border-alert-red/50 flex items-center justify-center text-alert-red shrink-0 animate-pulse mt-0.5 sm:mt-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-alert-red/20 text-alert-red border border-alert-red/30">
                    30 km Outbreak Radar
                  </span>
                  <span className="text-xs text-red-200 font-semibold">
                    {stats.top_outbreak.affected_farms_count} farms within {stats.top_outbreak.closest_farm_km} km reported {stats.top_outbreak.disease_name}!
                  </span>
                </div>
                <p className="text-xs text-surface-muted mt-0.5 leading-relaxed">
                  Preventive recommendation: Spray <span className="text-white font-medium">{stats.top_outbreak.preventive_medicine}</span> to protect your crops.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 self-end sm:self-center" />
          </div>
        </div>
      )}

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-muted">{t.total_scans}</span>
            <div className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-forest-300">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{stats.total_scans}</p>
          <p className="text-[11px] text-surface-muted mt-1">Verified with CNN model.h5</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-muted">{t.healthy_plants}</span>
            <div className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.healthy_count}</p>
          <p className="text-[11px] text-surface-muted mt-1">0% damage / robust foliage</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-muted">{t.diseased_plants}</span>
            <div className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-amber-400">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 tracking-tight">{stats.active_treatments_count}</p>
          <p className="text-[11px] text-surface-muted mt-1">Dynamic treatment loops active</p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div 
          onClick={() => onNavigate('scan')}
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-emerald-500/50 cursor-pointer transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/30 transition-all shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">{t.scan_plant}</h3>
              <p className="text-xs text-surface-muted mt-0.5">Instant leaf disease diagnosis & medicine recommendation</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div 
          onClick={() => onNavigate('treatment')}
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-amber-500/40 cursor-pointer transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 group-hover:bg-amber-500/30 transition-all shadow-sm">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">{t.treatment_loop}</h3>
              <p className="text-xs text-surface-muted mt-0.5">Check-in on Day 3, 6, 9... to verify if medicine is reacting</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Recent Treatment Loops Section */}
      <div className="rounded-2xl bg-surface-card border border-surface-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-forest-300" />
            <h3 className="text-sm font-bold text-white">Active Recovery Loops</h3>
          </div>
          <button 
            onClick={() => onNavigate('treatment')}
            className="text-xs text-forest-300 hover:text-white font-medium flex items-center gap-1"
          >
            {t.view_active} <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.recent_treatments.length === 0 ? (
            <div className="p-6 rounded-xl bg-surface-dark/50 border border-surface-border text-center">
              <Repeat className="w-8 h-8 text-surface-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-white">No Active Treatments Yet</p>
              <p className="text-[11px] text-surface-muted mt-1 max-w-sm mx-auto">
                Take a photo of any crop leaf with disease symptoms in "Scan Plant" and start your Day 0 recovery loop.
              </p>
              <button
                onClick={() => onNavigate('scan')}
                className="mt-3 px-4 py-1.5 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold transition-all shadow-sm"
              >
                Scan First Leaf
              </button>
            </div>
          ) : (
            stats.recent_treatments.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  if (onSelectTreatment) onSelectTreatment(item.id);
                  onNavigate('treatment');
                }}
                className="p-3.5 sm:p-4 rounded-xl bg-surface-dark/70 border border-surface-border hover:border-forest-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{item.plant_name} — {item.disease_name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-forest-900/50 text-forest-300 border border-forest-500/30 shrink-0">
                      Day {item.checkin_count * 3}
                    </span>
                  </div>
                  <p className="text-xs text-surface-muted mt-1 truncate">
                    Medicine: <span className="text-cream-200">{item.current_medicine}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border/50">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-surface-muted block">Damage Trend</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {item.initial_damage}% → {item.latest_damage}%
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-forest-300 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
