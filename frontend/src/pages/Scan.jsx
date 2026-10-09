import React, { useState, useRef } from 'react';
import { Camera, Upload, ArrowLeft, RefreshCw, MessageSquare, Repeat, CheckCircle2, AlertTriangle, Sparkles, MapPin } from 'lucide-react';
import { detectLeaf, startTreatment } from '../api/client';
import DamageBar from '../components/DamageBar';
import MedicineCard from '../components/MedicineCard';
function getHumanizedPrecautions(rawPrecaution, isHealthy) {
  if (isHealthy) {
    return [
      "Your plant looks healthy and strong! Keep watering normally at the soil level.",
      "Check the underside of leaves weekly to catch any early pests or spots early."
    ];
  }
  if (!rawPrecaution || rawPrecaution === "-") {
    return [
      "Separate this plant if possible so wind doesn't spread spores to other crops.",
      "Water gently at the base roots so the leaves stay dry and clean."
    ];
  }

  const tips = [];
  const text = rawPrecaution.toLowerCase();

  if (text.includes("prune")) {
    tips.push("✂️ Cut Sick Leaves: Snip off the spotted bottom leaves with clean shears so the infection cannot climb up the plant.");
  }
  if (text.includes("mulch")) {
    tips.push("🍂 Cover the Soil: Spread dry straw or leaves over the dirt around the stem. This acts like a blanket to stop muddy water and fungus from splashing onto leaves when watering.");
  }
  if (text.includes("overhead") || text.includes("foliage") || text.includes("evening watering")) {
    tips.push("💧 Water at Roots: Pour water directly at the base soil rather than spraying over the leaves to keep the foliage dry.");
  }
  if (text.includes("heat") || text.includes("sun") || text.includes("30") || text.includes("32")) {
    tips.push("☀️ Spray in Cool Hours: Apply medicine in the early morning so strong midday sun doesn't burn damp leaves.");
  }
  if (text.includes("harvest")) {
    tips.push("🧺 Harvest Safety: Wait the stated number of days after spraying before picking your harvest.");
  }
  if (text.includes("mask") || text.includes("gloves") || text.includes("protective")) {
    tips.push("🧤 Farmer Safety: Always wear gloves and a mask while mixing and applying agricultural sprays.");
  }

  if (tips.length === 0) {
    tips.push(`🌱 Field Tip: ${rawPrecaution}`);
    tips.push("💧 Water gently at the roots in the morning to keep foliage dry during recovery.");
  }

  return tips;
}

export default function Scan({ onNavigate, t, onOpenChat, onSelectTreatment, userLocation }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isStartingTreatment, setIsStartingTreatment] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [gpsShared, setGpsShared] = useState(true);

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const startLiveCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        setIsCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }, 100);
      } else {
        cameraInputRef.current?.click();
      }
    } catch (err) {
      console.warn("Direct webcam access unavailable, opening native camera:", err);
      cameraInputRef.current?.click();
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureLivePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `leaf_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
        stopLiveCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const isGps = userLocation?.source === 'GPS' && userLocation?.lat != null && userLocation?.lon != null;
    if (isGps) {
      formData.append('latitude', userLocation.lat);
      formData.append('longitude', userLocation.lon);
    }
    setGpsShared(isGps);

    try {
      const data = await detectLeaf(formData);
      setResult(data);
      try {
        localStorage.setItem('plantcare_chat_context', JSON.stringify({
          plant: data.plant_name,
          disease: data.disease_name,
          medicine: data.primary_medicine?.name || ""
        }));
      } catch (e) {}
    } catch (err) {
      setError(err.response?.data?.detail || "Could not analyze leaf photo. Please ensure backend is running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartTreatment = async () => {
    if (!result?.id) return;
    setIsStartingTreatment(true);
    try {
      const plan = await startTreatment(result.id);
      if (plan) {
        try {
          localStorage.setItem('plantcare_chat_context', JSON.stringify({
            plant: plan.plant_name,
            disease: plan.disease_name,
            medicine: plan.current_medicine || ""
          }));
        } catch (e) {}
      }
      if (onSelectTreatment) onSelectTreatment(plan.id);
      onNavigate('treatment');
    } catch (err) {
      console.warn("Could not save to remote DB, redirecting to treatment:", err);
      onNavigate('treatment');
    } finally {
      setIsStartingTreatment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-xs text-surface-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t.dashboard}
        </button>

        {userLocation && (
          <div className="flex items-center gap-1.5 text-xs text-forest-300 bg-[#141f17] border border-surface-border px-2.5 sm:px-3 py-1 rounded-xl">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold truncate max-w-[180px] sm:max-w-none">{(!userLocation.city || userLocation.city.toUpperCase().trim() === 'GPS' || userLocation.city.includes('GPS')) ? 'Katpadi, IN' : userLocation.city}</span>
          </div>
        )}
      </div>

      <div className="text-center max-w-xl mx-auto mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
          {t.scan_plant}
        </h1>
        <p className="text-xs sm:text-sm text-surface-muted mt-1">
          Upload or capture a leaf photo.
        </p>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div className="bg-surface-card border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center max-w-xl mx-auto shadow-sm">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => galleryInputRef.current?.click()}
            className="border-2 border-dashed border-forest-600/40 hover:border-forest-400 rounded-xl sm:rounded-2xl p-5 sm:p-8 cursor-pointer transition-all bg-surface-dark/50 flex flex-col items-center justify-center gap-3 group"
          >
            {previewUrl ? (
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-surface-border">
                <img src={previewUrl} alt="Leaf Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white font-medium">Click to change photo</span>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-sm">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.drop_image}</p>
                  <p className="text-xs text-surface-muted mt-1">Supports JPG, PNG, WEBP (Clear, well-lit leaf)</p>
                </div>
              </>
            )}
          </div>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={galleryInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons: Live Camera + Browse Gallery */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mt-5">
            <button
              onClick={startLiveCamera}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 glow-green active:scale-95"
            >
              <Camera className="w-4 h-4 text-emerald-100" />
              Take Live Photo
            </button>

            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border hover:bg-[#1a291e] text-xs font-semibold text-cream-100 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-surface-muted" /> {t.browse}
            </button>

            {previewUrl && (
              <button
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze Leaf
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface-dark border border-forest-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Camera className="w-4 h-4 text-forest-400" />
                Live Leaf Viewfinder
              </div>
              <button
                onClick={stopLiveCamera}
                className="text-xs text-surface-muted hover:text-white px-2 py-1 rounded-lg bg-surface-card"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-8 border-2 border-dashed border-forest-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] text-white/80 bg-black/50 px-2 py-1 rounded-md">
                  Position leaf inside frame
                </span>
              </div>
            </div>

            <div className="p-4 bg-surface-dark flex items-center justify-center gap-4">
              <button
                onClick={captureLivePhoto}
                className="w-16 h-16 rounded-full bg-forest border-4 border-forest-300 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg glow-green"
                title="Capture Photo"
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Result Card (Feature 1) */}
      {result && (
        <div className="bg-surface-card border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
          {/* Top Result Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-surface-border">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-forest-300">
                Diagnosis Complete
              </span>
              <h2 className="text-lg sm:text-2xl font-bold text-white flex flex-wrap items-center gap-2 mt-0.5">
                <span>{result.plant_name} — {result.disease_name}</span>
                {result.is_healthy ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Healthy
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3" /> Diseased
                  </span>
                )}
              </h2>
              {!gpsShared && (
                <p className="text-xs text-amber-400/90 mt-2">
                  Location (GPS) is off, so this scan was not shared with the outbreak radar.
                </p>
              )}
            </div>

            <button
              onClick={() => { setResult(null); setSelectedFile(null); setPreviewUrl(null); }}
              className="text-xs text-surface-muted hover:text-white flex items-center gap-1 self-start sm:self-center shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Scan Another Leaf
            </button>
          </div>

          {/* Visualization & Damage Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 my-5 sm:my-6">
            {/* Visual Leaf Segmentation Image */}
            <div className="relative rounded-2xl overflow-hidden border border-surface-border bg-surface-dark flex items-center justify-center min-h-[220px] max-h-72">
              <img
                src={result.annotated_image_url || result.image_url}
                alt="Segmented Leaf"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Damage Meter & Model Confidence */}
            <div className="flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Leaf Area Damage Analysis</h4>
                <DamageBar percent={result.damage_percent} label="Affected Tissue Area" />
              </div>

              {/* Humanized Precautions Explanation */}
              <div className="p-3 rounded-xl bg-surface-dark/90 border border-surface-border text-xs flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-forest-300 font-bold text-[11px] tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Precautions Explained (Simple Farmer Tips)</span>
                </div>
                <div className="space-y-1.5 leading-relaxed text-[11px]">
                  {getHumanizedPrecautions(result.primary_medicine?.precautions, result.is_healthy).map((tip, idx) => (
                    <p key={idx} className="flex items-start gap-1.5 text-stone-200">
                      <span className="text-forest-400 font-bold shrink-0">•</span>
                      <span>{tip}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs">
                <span className="text-surface-muted">Neural Network Confidence</span>
                <span className="font-bold text-forest-300">{(result.confidence * 100).toFixed(1)}% match</span>
              </div>
            </div>
          </div>

          {/* Medicine Prescription */}
          <div className="mb-5 sm:mb-6">
            <MedicineCard medicine={result.primary_medicine} title={t.medicine} />
          </div>

          {/* Action CTAs: Start Treatment (Day 0) and Ask AI Doctor */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-surface-border">
            {!result.is_healthy && (
              <button
                disabled={isStartingTreatment}
                onClick={handleStartTreatment}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-forest hover:bg-forest-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md glow-green active:scale-95"
              >
                <Repeat className="w-4 h-4" />
                {isStartingTreatment ? "Creating Plan..." : t.start_treatment}
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenChat) {
                  onOpenChat({
                    plant: result.plant_name,
                    disease: result.disease_name,
                    medicine: result.primary_medicine?.name || "Mancozeb 75% WP"
                  });
                }
                onNavigate('chat');
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-surface-dark border border-forest-500/40 hover:bg-[#18291c] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-forest-400" />
              {t.ask_ai}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
