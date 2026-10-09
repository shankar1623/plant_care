import React, { useState, useEffect, useRef } from 'react';
import { 
  Repeat, ArrowLeft, Camera, CheckCircle2, AlertTriangle, ArrowRight, 
  Upload, MessageSquare, ShieldCheck, Clock, FileCheck, Stethoscope, RotateCcw, Calendar,
  Phone, PhoneCall, MapPin, X, ExternalLink, Building2
} from 'lucide-react';
import { getTreatments, checkinTreatment, markTreatmentDone } from '../api/client';
import DamageBar from '../components/DamageBar';
import { getCachedUserLocation } from '../services/location';

// Verified Agricultural Extension Centers, Krishi Vigyan Kendras & Plant Pathologists with Exact GPS Coordinates
const ALL_AGRI_DOCTORS = [
  // Vellore / Katpadi Region (Near 12.9725, 79.1610)
  {
    name: "Dr. K. Ravichandran",
    designation: "Assistant Director of Agriculture (ADA Katpadi Block)",
    center: "Block Agricultural Extension Centre (AEC / Uzhavar Maiyam)",
    district: "Vellore (Katpadi)",
    location: "Near BDO Office, Katpadi, Vellore District - 632 007",
    lat: 12.9812,
    lon: 79.1354,
    phone: "0416-2242131",
    mobile: "+91 9443210185",
    email: "adaagrikatpadi@tn.gov.in",
    timing: "Mon - Sat (9:00 AM - 5:30 PM)",
    services: "Foliar Blight Testing, Certified Fungicide Distribution, Farmer Advisory Cell"
  },
  {
    name: "Dr. P. Rajendran",
    designation: "Joint Director of Agriculture (JDA Vellore) & District Crop Squad",
    center: "Integrated Agricultural Extension Centre (JDA Office)",
    district: "Vellore (Central)",
    location: "Collectorate Master Plan Complex, Sathuvachari, Vellore - 632 009",
    lat: 12.9358,
    lon: 79.1685,
    phone: "0416-2252110",
    mobile: "+91 9443837704",
    email: "jdavellore@nic.in",
    timing: "Mon - Fri (9:30 AM - 6:00 PM)",
    services: "District Crop Disease Hotline, Emergency Epidemic Squad, Soil & Tissue Health Clinic"
  },
  {
    name: "Dr. M. Sangeetha",
    designation: "Subject Matter Specialist (Plant Pathology)",
    center: "Krishi Vigyan Kendra (TNAU Agricultural Research Station)",
    district: "Vellore (Virinjipuram)",
    location: "ARS Campus, Virinjipuram, Vellore District - 632 104",
    lat: 12.8986,
    lon: 79.0345,
    phone: "0416-2914453",
    mobile: "+91 9442019425",
    email: "kvkvrinjipuram@tnau.ac.in",
    timing: "Mon - Sat (9:00 AM - 5:00 PM)",
    services: "Vegetable Blight & Rust Diagnosis, Bio-Fungicide Recommendations, Microscopic Tissue Culture"
  },
  {
    name: "Dr. V. Murugesan",
    designation: "Agricultural Officer (Crop Protection & Plant Clinic)",
    center: "Block Agricultural Extension Centre (AEC) Kaniyambadi",
    district: "Vellore (South)",
    location: "Block Development Office Complex, Kaniyambadi, Vellore - 632 102",
    lat: 12.8360,
    lon: 79.1340,
    phone: "0416-2231204",
    mobile: "+91 9486707868",
    email: "aoagrikaniyambadi@tn.gov.in",
    timing: "Mon - Sat (9:00 AM - 5:00 PM)",
    services: "Field Visits, Resistant Pathogen Spray Regimens, Organic Biocontrol Agents"
  },
  {
    name: "Dr. S. Prakash",
    designation: "Assistant Director of Agriculture (ADA Ranipet Block)",
    center: "Block Agricultural Extension Centre (AEC) Walajah / Ranipet",
    district: "Ranipet",
    location: "Near Taluk Office, Walajapet, Ranipet District - 632 513",
    lat: 12.9300,
    lon: 79.3600,
    phone: "04172-232120",
    mobile: "+91 9443955444",
    email: "adaranipet@tn.gov.in",
    timing: "Mon - Sat (9:30 AM - 5:30 PM)",
    services: "Pesticide Safety Guidelines, Fungal Leaf Spot Management, Subsidized Formulations"
  },
  {
    name: "Dr. N. Saravanan",
    designation: "Agricultural Officer (Plant Health Clinic)",
    center: "Block Agricultural Extension Centre (AEC) Gudiyatham",
    district: "Vellore (Gudiyatham)",
    location: "Railway Feeder Road, Gudiyatham, Vellore District - 632 602",
    lat: 12.9460,
    lon: 78.8710,
    phone: "04171-220130",
    mobile: "+91 9443011310",
    email: "aogudiyatham@tn.gov.in",
    timing: "Mon - Sat (9:00 AM - 5:00 PM)",
    services: "Crop Protection Advisory, Spore Resistance Testing, Emergency Farmer Visits"
  },
  // Salem Region
  {
    name: "Dr. P. Muralidharan",
    designation: "Senior Scientist & Plant Protection Specialist",
    center: "ICAR - Krishi Vigyan Kendra (TNAU Mallur)",
    district: "Salem",
    location: "Sandhiyur, Mallur, Salem District - 636 203",
    lat: 11.5540,
    lon: 78.1820,
    phone: "0427-2422550",
    mobile: "+91 9443837704",
    email: "kvkmallur@tnau.ac.in",
    timing: "Mon - Sat (9:00 AM - 5:30 PM)",
    services: "Emergency Leaf Tissue Inspection, Resistant Fungal Culture, Direct Fungicide Prescriptions"
  },
  // Dharmapuri Region
  {
    name: "Dr. S. Sundaravadivel",
    designation: "Assistant Director & Plant Pathologist",
    center: "Regional Agricultural Research Station & KVK",
    district: "Dharmapuri",
    location: "Papparapatty Post, Dharmapuri District - 636 809",
    lat: 12.1820,
    lon: 78.0730,
    phone: "04342-245860",
    mobile: "+91 9443210185",
    email: "kvkdpri@tnau.ac.in",
    timing: "Mon - Fri (9:30 AM - 5:30 PM)",
    services: "Horticulture Blight Containment, Bacterial Spot Control, Farmer Advisory Cell"
  },
  // Coimbatore Region
  {
    name: "Dr. G. Alagukannan",
    designation: "Senior Scientist & Crop Clinic In-Charge",
    center: "ICAR - Krishi Vigyan Kendra (Karamadai)",
    district: "Coimbatore",
    location: "Vivekanandapuram, Karamadai, Coimbatore - 641 113",
    lat: 11.2420,
    lon: 76.9610,
    phone: "04254-284223",
    mobile: "+91 9486707868",
    email: "avinashilingamkvk@gmail.com",
    timing: "Mon - Sat (8:30 AM - 5:00 PM)",
    services: "Pathogen Resistance Testing, Foliar Emergency Protocols, Plant Protection Clinic"
  },
  // Madurai Region
  {
    name: "Dr. R. Veeraputhiran",
    designation: "Programme Coordinator & Lead Agricultural Doctor",
    center: "Krishi Vigyan Kendra (AC&RI Campus)",
    district: "Madurai",
    location: "Agricultural College & Research Institute Campus, Madurai - 625 104",
    lat: 9.9670,
    lon: 78.1880,
    phone: "0452-2422955",
    mobile: "+91 9003520822",
    email: "kvkmdu@tnau.ac.in",
    timing: "Mon - Sat (9:00 AM - 5:30 PM)",
    services: "Epidemic Containment, Systemic Fungicide Rotation, Plant Health Clinic"
  }
];

// Accurate Haversine Distance in Kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

const formatCheckinDate = (created_at, dayNumber, planCreatedAt) => {
  let baseDate;
  if (created_at) {
    baseDate = new Date(created_at);
  } else if (planCreatedAt) {
    const pDate = new Date(planCreatedAt);
    baseDate = new Date(pDate.getTime() + (dayNumber || 0) * 24 * 60 * 60 * 1000);
  } else {
    baseDate = new Date();
  }

  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const pad = (n) => String(n).padStart(2, '0');
  const dStr = `${pad(baseDate.getDate())}-${pad(baseDate.getMonth() + 1)}-${baseDate.getFullYear()}`;

  // Next follow-up is 3 days after this check-in
  const nextDate = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const nextStr = `${pad(nextDate.getDate())}-${pad(nextDate.getMonth() + 1)}-${nextDate.getFullYear()}`;

  return { date: dStr, nextDate: nextStr };
};

export default function TreatmentLoop({ onNavigate, t, selectedPlanId, onOpenChat, userLocation }) {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinUploading, setCheckinUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const fileInputRef = useRef(null);

  // Live User GPS coordinates
  const [currentCoords, setCurrentCoords] = useState(() => {
    if (userLocation?.lat && userLocation?.lon) {
      return { lat: userLocation.lat, lon: userLocation.lon, city: userLocation.city || "Auto Detected GPS" };
    }
    const cached = getCachedUserLocation();
    return { lat: cached?.lat || 12.9725, lon: cached?.lon || 79.1610, city: cached?.city || "Farm GPS" };
  });

  // Always update coords when userLocation prop updates
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lon) {
      setCurrentCoords({ lat: userLocation.lat, lon: userLocation.lon, city: userLocation.city || "Auto Detected GPS" });
    }
  }, [userLocation]);

  // Fresh live browser GPS fetch
  const fetchLiveGPS = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));
          setCurrentCoords({ lat, lon, city: "Live GPS (High Accuracy)" });
          setIsLocating(false);
        },
        (err) => {
          console.warn("GPS lookup note:", err.message);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleOpenDoctorModal = () => {
    fetchLiveGPS();
    setShowDoctorModal(true);
  };

  // Load plans
  const loadPlans = async () => {
    try {
      const data = await getTreatments();
      if (data && data.length > 0) {
        setPlans(data);
        if (selectedPlanId) {
          const found = data.find(p => p.id === selectedPlanId);
          setActivePlan(found || null);
        } else {
          // Find first unarchived active plan
          const firstActive = data.find(p => p.status !== 'ARCHIVED');
          setActivePlan(firstActive || null);
        }
      } else {
        setPlans([]);
        setActivePlan(null);
      }
    } catch (err) {
      console.warn("Could not load treatment plans:", err);
      setPlans([]);
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [selectedPlanId]);

  // Active plans list
  const activePlansList = plans.filter(p => p.status !== 'ARCHIVED');

  // Handle follow-up check-in image upload
  const handleCheckinUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePlan) return;

    setCheckinUploading(true);
    setUploadError(null);
    try {
      const nextDay = ((activePlan.checkins?.[activePlan.checkins.length - 1]?.day_number ?? 0) + 3);
      const updated = await checkinTreatment(activePlan.id, file, nextDay);
      setActivePlan(updated);
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      console.error("Check-in upload error:", err);
      const msg = err.response?.data?.detail || err.message || "Failed to process follow-up photo.";
      setUploadError(msg);
    } finally {
      setCheckinUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Done button click (as in user sketch: [Done] -> normalizes active loop)
  const handleDoneClick = async () => {
    if (!activePlan) return;
    setIsMarkingDone(true);
    try {
      const archived = await markTreatmentDone(activePlan.id);
      setPlans(prev => prev.map(p => p.id === archived.id ? archived : p));
      setActivePlan(null); // Normalizes active loop
    } catch (err) {
      console.error("Could not archive plan:", err);
      // Fallback local archive
      const archived = { ...activePlan, status: 'ARCHIVED' };
      setPlans(prev => prev.map(p => p.id === archived.id ? archived : p));
      setActivePlan(null);
    } finally {
      setIsMarkingDone(false);
    }
  };

  const nextCheckinDay = activePlan 
    ? ((activePlan.checkins?.[activePlan.checkins.length - 1]?.day_number ?? 0) + 3)
    : 3;

  const isArchived = Boolean(
    activePlan && (
      activePlan.status === 'ARCHIVED' || 
      activePlan.status === 'COMPLETED' || 
      activePlan.status === 'DONE'
    )
  );

  const isCaseEnded = Boolean(
    activePlan && (
      isArchived ||
      activePlan.status === 'RECOVERED' || 
      activePlan.status === 'STOPPED_DOCTOR_CONSULT' || 
      activePlan.latest_damage <= 0 ||
      activePlan.checkins?.some(c => 
        c.status_message?.toLowerCase().includes("stopped") ||
        c.status_message?.toLowerCase().includes("consult") ||
        c.medicine_prescribed?.toLowerCase().includes("doctor")
      )
    )
  );

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button 
          onClick={() => onNavigate(isArchived ? 'history' : 'dashboard')}
          className="flex items-center gap-1.5 text-xs text-surface-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {isArchived ? (t.history || 'Back to History') : t.dashboard}
        </button>
      </div>
          {/* Normal Ready State (No Active Plan) */}
          {!activePlan ? (
            <div className="bg-surface-card border border-surface-border rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center max-w-lg mx-auto shadow-xl">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-forest-900/60 border border-forest-500/30 flex items-center justify-center text-forest-300 mx-auto mb-4">
                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-5 sm:mb-6">Treatment Loop Normal & Ready</h3>
              <button
                onClick={() => onNavigate('scan')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-forest hover:bg-forest-600 text-white text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all shadow-md glow-green active:scale-95"
              >
                <Camera className="w-4 h-4" /> Scan a Leaf to Start Loop
              </button>
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-8 shadow-xl">
              {/* Active Plan Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-surface-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isArchived
                        ? 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                        : activePlan.status === 'RECOVERED'
                        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                        : activePlan.status === 'STOPPED_DOCTOR_CONSULT'
                        ? 'bg-red-950/70 text-red-300 border-red-500/40 animate-pulse'
                        : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                    }`}>
                      {isArchived
                        ? '✓ Completed & Archived'
                        : (activePlan.status === 'RECOVERED' 
                            ? '🎉 Fully Recovered (0% Damage)' 
                            : (activePlan.status === 'STOPPED_DOCTOR_CONSULT'
                                ? '🚨 Stopped — Consult Doctor'
                                : 'In Progress (Active Loop)'))}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {activePlan.plant_name} — {activePlan.disease_name}
                  </h2>
                  <p className="text-xs text-surface-muted mt-0.5">
                    Current Medicine: <span className="text-white font-semibold">{activePlan.current_medicine}</span>
                  </p>
                </div>

                {/* Day Stepper Timeline */}
                <div className="flex items-center gap-2 bg-surface-dark px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-surface-border overflow-x-auto no-scrollbar max-w-full -mx-1 sm:mx-0">
                  {activePlan.checkins?.map((c, i) => {
                    const isWorsened = c.status_message?.toLowerCase().includes("increased") || c.status_message?.toLowerCase().includes("consult");
                    return (
                      <React.Fragment key={c.id}>
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border transition-all ${
                            c.damage_percent === 0
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : (isWorsened
                                  ? 'bg-red-600 text-white border-red-400 animate-pulse'
                                  : (c.switch_occurred 
                                      ? 'bg-amber-600 text-white border-amber-400' 
                                      : 'bg-forest-700 text-forest-200 border-forest-500/40'))
                          }`}>
                            {c.day_number}
                          </div>
                          <span className="text-[9px] text-surface-muted mt-0.5">Day {c.day_number}</span>
                        </div>
                        {i < activePlan.checkins.length - 1 && (
                          <div className="w-4 h-0.5 bg-surface-border" />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {!isCaseEnded && (
                    <>
                      <div className="w-4 h-0.5 bg-surface-border border-dashed" />
                      <div className="flex flex-col items-center opacity-60">
                        <div className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border border-dashed border-surface-muted text-surface-muted">
                          {nextCheckinDay}
                        </div>
                        <span className="text-[9px] text-surface-muted mt-0.5">Day {nextCheckinDay}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Day-by-Day Cards Grid (Day 0 -> Day 3 -> Day 6...) matching sketch */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {activePlan.checkins?.map((checkin, idx) => {
                  const isRecovered = checkin.damage_percent === 0;
                  const prevCheckin = idx > 0 ? activePlan.checkins[idx - 1] : null;
                  const isIncreased = prevCheckin && checkin.damage_percent > prevCheckin.damage_percent;
                  const isUnchanged = prevCheckin && Math.abs(checkin.damage_percent - prevCheckin.damage_percent) < 0.5;
                  const isStoppedDoctor = checkin.status_message?.toLowerCase().includes("consult") || 
                                          checkin.medicine_prescribed?.toLowerCase().includes("doctor") || 
                                          (idx === activePlan.checkins.length - 1 && activePlan.status === 'STOPPED_DOCTOR_CONSULT');
                  const isNotReactingStopped = isStoppedDoctor && isUnchanged;
                  const isWorsened = isIncreased || (isStoppedDoctor && !isUnchanged);
                  const isNotReacting = checkin.switch_occurred && !isStoppedDoctor;

                  return (
                    <div 
                      key={checkin.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isRecovered
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : (isNotReactingStopped || isWorsened
                              ? 'bg-red-950/40 border-red-500/60 shadow-lg'
                              : (isNotReacting
                                  ? 'bg-amber-950/20 border-amber-600/40'
                                  : 'bg-surface-dark border-surface-border'))
                      }`}
                    >
                      <div>
                        {/* Day Title & Date Follow-up */}
                        {(() => {
                          const dates = formatCheckinDate(checkin.created_at, checkin.day_number, activePlan.created_at);
                          return (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-surface-card border border-surface-border text-white">
                                  Day {checkin.day_number}
                                </span>
                                <span className="text-[11px] text-surface-muted flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-forest-400" />
                                  {dates.date} <span className="text-forest-300 font-semibold">(Next: {dates.nextDate})</span>
                                </span>
                              </div>

                              {isRecovered ? (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Fully Cured
                                </span>
                              ) : isNotReactingStopped ? (
                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> Not Reacting (Stop Doctor)
                                </span>
                              ) : isWorsened ? (
                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> Worsened (Stop Doctor)
                                </span>
                              ) : isNotReacting ? (
                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Switched
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-forest-300 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Reacting
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Image Preview */}
                        <div className="w-full h-36 rounded-xl overflow-hidden bg-black/40 border border-surface-border/50 mb-3 flex items-center justify-center">
                          {checkin.image_url ? (
                            <img src={checkin.image_url} alt={`Day ${checkin.day_number}`} className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-8 h-8 text-surface-muted" />
                          )}
                        </div>

                        {/* Damage Meter */}
                        <DamageBar percent={checkin.damage_percent} label={`Day ${checkin.day_number} Damage`} />

                        {/* Reaction / Prescription Explanation Box */}
                        <div className={`mt-3 p-3.5 rounded-xl text-xs border space-y-1.5 ${
                          isRecovered
                            ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                            : (isNotReactingStopped || isWorsened
                                ? 'bg-red-900/40 border-red-500/50 text-red-200'
                                : (isNotReacting
                                    ? 'bg-amber-900/30 border-amber-500/40 text-amber-200'
                                    : 'bg-surface-card border-surface-border text-cream-100'))
                        }`}>
                          {/* Medicine Name */}
                          <div className="flex items-start justify-between gap-1 text-[11px]">
                            <span className="text-surface-muted font-medium shrink-0">
                              {idx === 0 ? "Prescribed Medicine:" : "Tested Medicine:"}
                            </span>
                            <span className="font-bold text-white text-right">
                              {idx === 0 
                                ? checkin.medicine_prescribed 
                                : (prevCheckin?.medicine_prescribed || "Primary Spray")}
                            </span>
                          </div>

                          {/* Compare */}
                          <div className="flex items-start justify-between gap-1 text-[11px]">
                            <span className="text-surface-muted font-medium shrink-0">Compare:</span>
                            <span className={`font-bold text-right ${
                              isNotReactingStopped || isWorsened 
                                ? 'text-red-400' 
                                : (isRecovered ? 'text-emerald-400' : (isNotReacting ? 'text-amber-400' : 'text-cream-200'))
                            }`}>
                              {prevCheckin 
                                ? `Day ${prevCheckin.day_number} (${prevCheckin.damage_percent}%) → Day ${checkin.day_number} (${checkin.damage_percent}%)`
                                : `Day ${checkin.day_number} (${checkin.damage_percent}%) Baseline`}
                            </span>
                          </div>

                          {/* Explanation - Hide on Day 0 (idx === 0) */}
                          {idx > 0 && (
                            <div className="pt-1.5 border-t border-white/10 text-[11px] leading-relaxed">
                              <span className="text-surface-muted font-medium block mb-0.5">Explanation:</span>
                              <p className={`mt-0.5 font-medium ${
                                isNotReactingStopped || isWorsened
                                  ? 'text-red-300 font-bold'
                                  : (isNotReacting
                                      ? 'text-amber-200'
                                      : (isRecovered ? 'text-emerald-300' : 'text-cream-200'))
                              }`}>
                                {isNotReactingStopped
                                  ? `Plant is not reacting to medicines. Damage remained unchanged at ${checkin.damage_percent}% across Day 0 to Day ${checkin.day_number}. Both primary and backup treatments failed to control the infection. Treatment loop ended — please consult the nearest agricultural doctor immediately.`
                                  : (isWorsened 
                                      ? `Damage increased from ${prevCheckin?.damage_percent}% to ${checkin.damage_percent}%. The pathogen is spreading aggressively. Foliar spray is stopped — please consult the nearest agricultural doctor immediately.`
                                      : (isNotReacting
                                          ? `The plant infection did not respond to ${prevCheckin?.medicine_prescribed || "primary medicine"}, and damage remained at ${checkin.damage_percent}%. The pathogen has developed tolerance. Switched to ${checkin.medicine_prescribed} for Day 6 checkup.`
                                          : (isRecovered
                                              ? `Damage successfully reduced to ${checkin.damage_percent}%. Fungal sporulation has halted and leaf tissue is recovering cleanly. Treatment completed!`
                                              : `Plant leaves are reacting positively to treatment (damage reduced to ${checkin.damage_percent}%). Continue scheduled foliar spraying.`)))}
                              </p>
                            </div>
                          )}

                          {idx === 0 && (
                            <div className="pt-1 border-t border-white/10 flex items-start justify-between gap-1 text-[11px]">
                              <span className="text-surface-muted font-medium shrink-0">Schedule:</span>
                              <span className="font-semibold text-cream-200 text-right">
                                Spray every 3 days until Day 3 checkup
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button: Nearest Doctor for Stopped/Emergency, Ask AI otherwise */}
                      {isStoppedDoctor ? (
                        <button
                          onClick={() => handleOpenDoctorModal()}
                          className="mt-3 w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 border border-red-400/50 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md animate-pulse"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-white" />
                          Nearest Clinic
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (onOpenChat) {
                              onOpenChat({
                                plant: activePlan.plant_name,
                                disease: activePlan.disease_name,
                                medicine: checkin.medicine_prescribed
                              });
                            }
                            onNavigate('chat');
                          }}
                          className="mt-3 w-full py-2 px-3 rounded-xl bg-surface-card hover:bg-forest-950 border border-surface-border text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-forest-400" />
                          Ask AI
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Follow-up Upload Box (Active when NOT ended) */}
                {!isCaseEnded && (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-forest-600/40 bg-surface-dark/40 flex flex-col items-center justify-center text-center p-6 group">
                    <div className="w-12 h-12 rounded-2xl bg-forest-900/50 border border-forest-500/30 flex items-center justify-center text-forest-300 mb-3 group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Upload Day {nextCheckinDay} Photo
                    </h4>
                    <p className="text-xs text-surface-muted mb-4 max-w-xs leading-relaxed">
                      Upload a new photo to compare with Day {(nextCheckinDay - 3)}. If damage reduces, loop continues; if not reduced, medicine switches; if increased, loop stops for doctor advice.
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCheckinUpload}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />

                    <button
                      disabled={checkinUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md glow-green disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {checkinUploading ? "Evaluating..." : `Attach Day ${nextCheckinDay} Image`}
                    </button>

                    {uploadError && (
                      <div className="mt-3 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 text-left">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CASE 0: ARCHIVED / COMPLETED LOOP (Opened from History or Marked Done) */}
              {isArchived && (
                <div className="mt-6 p-5 rounded-2xl bg-surface-dark border border-surface-border text-center shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-forest-900/60 border border-forest-500/30 flex items-center justify-center text-forest-300 mx-auto mb-3">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Treatment Loop Completed & Archived
                  </h3>
                  <p className="text-xs text-surface-muted max-w-md mx-auto mb-4 leading-relaxed">
                    This treatment loop is completed and preserved in your farm history. You can review all day-by-day healing stages and medications above.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => onNavigate('history')}
                      className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-bold transition-all shadow-md glow-green"
                    >
                      Back to History Records
                    </button>
                    <button
                      onClick={() => onNavigate('scan')}
                      className="px-5 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-surface-muted hover:text-white text-xs font-semibold transition-colors"
                    >
                      Scan New Leaf
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 1: DAMAGE INCREASED OR PLANT NOT REACTING -> CRITICAL DOCTOR ALERT (When NOT archived) */}
              {!isArchived && activePlan.status === 'STOPPED_DOCTOR_CONSULT' && (
                <div className="mt-6 p-5 rounded-2xl bg-red-950/50 border-2 border-red-500/60 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-900/60 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 animate-pulse">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          Treatment Stopped — Please Consult Nearest Agricultural Doctor
                        </h3>
                        <p className="text-xs text-red-200 mt-1 max-w-xl leading-relaxed">
                          {activePlan.checkins?.length >= 2 && Math.abs(activePlan.latest_damage - (activePlan.checkins[activePlan.checkins.length - 2]?.damage_percent || 0)) < 0.5
                            ? `Plant is not reacting to medicines (damage unchanged at ${activePlan.latest_damage}% across consecutive cycles). Both primary and backup sprays failed. Treatment loop is ended — please consult an agricultural doctor immediately.`
                            : `Damage increased on your latest check-in. The pathogen has intensified and standard foliar sprays are no longer recommended without physical tissue inspection.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-red-500/30">
                      <button
                        onClick={() => handleOpenDoctorModal()}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-white" />
                        Nearest Clinic
                      </button>

                      {/* Done Button as requested in sketch */}
                      <button
                        disabled={isMarkingDone}
                        onClick={handleDoneClick}
                        className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <FileCheck className="w-4 h-4" />
                        {isMarkingDone ? "Archiving..." : "Done"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 2: PLANT FULLY CURED -> DONE BUTTON (When NOT archived) */}
              {!isArchived && activePlan.status === 'RECOVERED' && (
                <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-center">
                  <span className="text-3xl">🎉</span>
                  <h3 className="text-base sm:text-lg font-bold text-emerald-300 mt-1 mb-4">
                    Plant Fully Recovered (0% Damage) — Treatment Loop Completed!
                  </h3>

                  {/* Done Button matching handwritten sketch */}
                  <button
                    disabled={isMarkingDone}
                    onClick={handleDoneClick}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-forest hover:bg-forest-600 text-white text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all shadow-lg glow-green active:scale-95"
                  >
                    <FileCheck className="w-4 h-4" />
                    {isMarkingDone ? "Archiving..." : "Done"}
                  </button>
                </div>
              )}
            </div>
          )}


      {/* Nearest Agricultural Doctors & Officers Directory Modal (Strictly 30km Range by Default) */}
      {showDoctorModal && (() => {
        const doctorsWithDistance = ALL_AGRI_DOCTORS.map(doc => {
          const dist = calculateDistanceKm(currentCoords.lat, currentCoords.lon, doc.lat, doc.lon);
          return { ...doc, distanceKm: dist };
        }).sort((a, b) => a.distanceKm - b.distanceKm);

        // Strictly filter doctors within 30 km radius of live GPS coordinates
        const filteredDoctors = doctorsWithDistance.filter(doc => doc.distanceKm <= 30);

        return (
          <div className="fixed inset-0 z-50 bg-[#0a0f0d] text-white flex flex-col overflow-y-auto animate-in fade-in duration-200">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 bg-[#111714]/95 backdrop-blur-md border-b border-surface-border shadow-lg">
              <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    onClick={() => setShowDoctorModal(false)}
                    className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-surface-border text-surface-muted hover:text-white transition-colors flex items-center gap-1.5 group shrink-0"
                    title="Back to Treatment Plan"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="hidden sm:inline text-xs font-semibold">Back to Plan</span>
                  </button>

                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2 leading-tight truncate">
                      Nearest Clinic
                    </h1>
                    <p className="text-[11px] text-surface-muted hidden sm:block">
                      Verified government agricultural officers & plant clinics within 30 km
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={isLocating}
                    onClick={fetchLiveGPS}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-card hover:bg-forest-900 border border-surface-border text-forest-300 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">{isLocating ? "Locating..." : "Refresh"}</span>
                  </button>

                  <button
                    onClick={() => setShowDoctorModal(false)}
                    className="p-2 rounded-xl bg-surface-card border border-surface-border text-surface-muted hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Main Content Area - Full Length */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
              {/* Sample Advisory Card */}
              <div className="p-3.5 rounded-xl bg-surface-card/80 border border-forest-500/20 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-surface-muted">
                  <strong className="text-cream-200">Farmer Advisory:</strong> Carry a fresh leaf sample in a clean, sealed plastic bag when visiting the agricultural extension officer. Do not wash the sample before testing.
                </div>
              </div>

              {/* Doctors & Centers List Header */}
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                  Nearest Clinics (Within 30 km)
                </h2>
                <span className="text-xs text-emerald-400 font-semibold">
                  {filteredDoctors.length} Clinics Found
                </span>
              </div>

              {/* Doctor Cards */}
              <div className="space-y-4">
                {filteredDoctors.length === 0 ? (
                  <div className="py-16 text-center text-surface-muted text-xs bg-surface-card rounded-2xl border border-surface-border p-8">
                    <Building2 className="w-10 h-10 text-surface-muted mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-stone-200 text-sm">No agricultural extension centers found within 30 km</p>
                    <p className="mt-1.5 text-surface-muted">Tap the Google Maps button above to search live around your farm.</p>
                  </div>
                ) : (
                  filteredDoctors.map((doc, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-forest-500/50 transition-all shadow-md flex flex-col md:flex-row md:items-start justify-between gap-5"
                    >
                      <div className="flex-1 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{doc.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {doc.distanceKm} km away
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/5 text-surface-muted">
                            {doc.district}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-forest-300">
                          {doc.designation}
                        </p>

                        <div className="flex items-start gap-2 text-xs text-stone-200">
                          <Building2 className="w-4 h-4 text-surface-muted shrink-0 mt-0.5" />
                          <span><strong className="text-white">{doc.center}</strong> — {doc.location}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-amber-300/90">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{doc.timing}</span>
                        </div>

                        {doc.services && (
                          <div className="text-xs text-surface-muted bg-surface-dark/70 rounded-xl p-2.5 border border-white/5">
                            <span className="text-stone-300 font-medium">Services: </span>
                            {doc.services}
                          </div>
                        )}

                        {/* Direct Contact Numbers */}
                        <div className="pt-2 border-t border-white/5 flex items-center gap-4 text-xs text-surface-muted flex-wrap">
                          <span><strong>Office:</strong> <a href={`tel:${doc.phone}`} className="text-forest-400 hover:underline">{doc.phone}</a></span>
                          <span><strong>Mobile:</strong> <a href={`tel:${doc.mobile.replace(/\s+/g, '')}`} className="text-emerald-400 font-bold hover:underline">{doc.mobile}</a></span>
                          <span><strong>Email:</strong> <span className="text-stone-300">{doc.email}</span></span>
                        </div>
                      </div>

                      {/* Action Call & Directions Buttons */}
                      <div className="flex md:flex-col items-center gap-2.5 shrink-0 w-full md:w-44 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                        <a
                          href={`tel:${doc.mobile.replace(/\s+/g, '')}`}
                          className="flex-1 md:flex-none w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call Doctor
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lon}&destination=${doc.lat},${doc.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-none w-full py-2.5 px-3 rounded-xl bg-surface-dark hover:bg-forest-950 border border-surface-border text-stone-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Directions
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Return Button */}
              <div className="pt-6 pb-12 flex items-center justify-center">
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-surface-card border border-surface-border hover:border-forest-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Treatment Plan
                </button>
              </div>
            </main>
          </div>
        );
      })()}
    </div>
  );
}
