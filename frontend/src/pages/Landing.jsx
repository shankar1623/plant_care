import React from 'react';
import { Sprout, Camera, Repeat, MessageSquare, ShieldAlert, History, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SignInButton, SignUpButton, useUser } from '@clerk/clerk-react';

export default function Landing({ onNavigate, t }) {
  let isSignedIn = false;
  try {
    const { isSignedIn: signed } = useUser();
    isSignedIn = signed;
  } catch (e) {}

  const features = [
    {
      title: "Leaf Disease Detection",
      desc: "Instant leaf diagnosis with 38+ disease classes and exact percentage damage segmentation.",
      icon: Camera,
      tag: "model.h5 + OpenCV"
    },
    {
      title: "Treatment Loop Tracker",
      desc: "Multi-day check-in tracker (Day 0, 3, 6, 9...). Detects medicine reaction and switches dynamically until 0% cured.",
      icon: Repeat,
      tag: "Dynamic 3-Day Cycle"
    },
    {
      title: "Multilingual AI Doctor",
      desc: "Conversational guidance in 5 languages (English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ) grounded in medicine table.",
      icon: MessageSquare,
      tag: "Groq LLM"
    },
    {
      title: "Community Outbreak Radar",
      desc: "Automatic 30 km cluster detection alerts nearby farmers when 3 farms report the same pathogen in 7 days.",
      icon: ShieldAlert,
      tag: "30 km Geo-Clustering"
    },
    {
      title: "Case History & Archives",
      desc: "Visual history logs of cured crops, archived treatment loops, and multi-stage leaf healing photographs.",
      icon: History,
      tag: "Complete Case Logs"
    },
    {
      title: "Knowledge Vault",
      desc: "Curated spray intervals, mixing dosages, precautions, and organic remedies for 38 crop conditions.",
      icon: BookOpen,
      tag: "Curated Database"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A110C] text-cream-50">
      {/* Top Banner Bar */}
      <header className="border-b border-surface-border bg-[#0E1711]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest flex items-center justify-center border border-forest-500/40">
              <Sprout className="w-5 h-5 text-forest-300" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">PlantCare</span>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md">
                  {t.sign_in} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-10 sm:pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900/80 border border-forest-500/40 text-forest-300 text-xs font-semibold mb-5 sm:mb-6">
          <Sprout className="w-3.5 h-3.5 text-forest-400" />
          AI-Powered Precision Crop Care
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4 sm:mb-5 leading-tight">
          Detect. Treat. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 via-emerald-400 to-forest-400">
            Protect your crops.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-surface-muted text-xs sm:text-base mb-6 sm:mb-8 leading-relaxed px-2">
          Upload a leaf photo, meet your AI doctor, track multi-day recovery loops until 0% damage, and stop community disease outbreaks in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('scan')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-forest hover:bg-forest-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg glow-green active:scale-95"
          >
            <Camera className="w-4 h-4" /> Scan a Leaf Now
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#142017] hover:bg-[#1a2b1f] border border-surface-border text-cream-100 font-semibold text-sm transition-all active:scale-95"
          >
            Explore Dashboard
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mt-12 sm:mt-16 text-left">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div 
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-[#121c15] border border-surface-border hover:border-forest-500/50 transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-forest-900/60 border border-forest-600/30 flex items-center justify-center text-forest-300 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-dark border border-surface-border text-forest-300">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-surface-muted leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
