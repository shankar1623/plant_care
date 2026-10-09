import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, MapPin, AlertTriangle, CheckCircle2, Droplets } from 'lucide-react';
import { getOutbreakAlerts } from '../api/client';

export default function Outbreak({ onNavigate, t, userLocation: propLocation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentLoc = propLocation || { lat: 12.9725, lon: 79.1610, city: "Katpadi, IN" };

  const [cityName, setCityName] = useState(() => {
    const raw = currentLoc?.city;
    if (raw && raw.toUpperCase().trim() !== "GPS" && !raw.includes("Farm GPS") && !raw.includes("Auto Farm")) {
      return raw;
    }
    return "Katpadi, IN";
  });

  useEffect(() => {
    if (currentLoc?.lat && currentLoc?.lon) {
      if (!cityName || cityName.toUpperCase().trim() === "GPS" || cityName.includes("GPS")) {
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentLoc.lat}&longitude=${currentLoc.lon}&localityLanguage=en`
        )
          .then((r) => r.json())
          .then((d) => {
            const place = d.locality || d.city || d.principalSubdivision;
            const country = d.countryCode || "IN";
            if (place) setCityName(`${place}, ${country}`);
          })
          .catch(() => setCityName("Katpadi, IN"));
      }
    }
  }, [currentLoc?.lat, currentLoc?.lon]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getOutbreakAlerts(currentLoc.lat, currentLoc.lon, 30.0);
      if (data && data.length > 0) {
        setAlerts(data);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.warn("Could not fetch outbreak data:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentLoc.lat, currentLoc.lon]);

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-alert-red shrink-0" />
          <span>{t.outbreak_radar}</span>
        </h1>
      </div>

      {/* Location / Radius Status Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-card border border-surface-border mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
        <div className="flex items-center gap-2 text-surface-muted min-w-0">
          <MapPin className="w-4 h-4 text-forest-400 shrink-0" />
          <span className="truncate">Location: <strong className="text-white">{cityName}</strong></span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-surface-dark border border-surface-border font-bold text-forest-300 text-[11px]">
            Scan Radius: 30.0 km
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-dark border border-surface-border font-bold text-emerald-400 text-[11px]">
            Window: Last 7 Days
          </span>
        </div>
      </div>

      {/* Outbreak Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-surface-card border border-surface-border text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Active Disease Outbreaks</h3>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const isHigh = alert.risk_level === "HIGH";
          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                isHigh
                  ? 'bg-gradient-to-r from-red-950/40 via-[#1a1213] to-surface-card border-alert-red/50 shadow-lg'
                  : 'bg-gradient-to-r from-amber-950/30 via-[#181512] to-surface-card border-amber-600/40'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 sm:p-3 rounded-2xl shrink-0 ${
                    isHigh ? 'bg-red-900/40 text-alert-red border border-alert-red/40' : 'bg-amber-900/40 text-amber-400 border border-amber-500/40'
                  }`}>
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        isHigh
                          ? 'bg-alert-red/20 text-alert-red border-alert-red/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {isHigh ? t.high_risk : t.moderate_risk}
                      </span>
                      <span className="text-xs font-semibold text-surface-muted">
                        {alert.affected_farms_count} {t.outbreak_detected}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {alert.plant_name} — {alert.disease_name}
                    </h3>

                    <p className="text-xs text-cream-200 mt-1 max-w-xl leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Action Remedy Banner */}
                    <div className="mt-3 p-3 rounded-xl bg-surface-dark/80 border border-surface-border/80 flex items-center gap-2.5 text-xs">
                      <Droplets className="w-4 h-4 text-forest-300 shrink-0" />
                      <div>
                        <span className="text-[10px] text-surface-muted uppercase font-bold block">
                          Preventive Medicine to Safeguard Crops
                        </span>
                        <span className="font-semibold text-white">{alert.preventive_medicine}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proximity Distance Metric */}
                <div className="w-full md:w-auto shrink-0 text-left md:text-right bg-surface-dark/60 p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-surface-muted block">Closest Cluster Report</span>
                  <span className={`text-base font-bold ${isHigh ? 'text-alert-red' : 'text-amber-400'}`}>
                    {alert.closest_farm_km} km away
                  </span>
                  <span className="text-[10px] text-surface-muted block mt-0.5">Within 30 km (Last 7 Days)</span>
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}
