import React, { useState } from 'react';
import { Sprout, ShieldAlert, Menu, X, Home, Camera, Repeat, History } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

export default function Navbar({ t, onNavigate, activePage, outbreakCount = 0 }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gracefully handle Clerk user if Clerk is configured
  let clerkUser = null;
  try {
    const { user } = useUser();
    clerkUser = user;
  } catch (e) {
    // Clerk not loaded yet or disabled
  }

  const handleNavClick = (page) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: Home },
    { id: 'scan', label: t.scan_plant, icon: Camera },
    { id: 'treatment', label: t.treatment_loop, icon: Repeat },
    { id: 'outbreak', label: t.outbreak_radar, icon: ShieldAlert, badge: outbreakCount },
    { id: 'history', label: t.history || 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0e1711]/95 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Logo */}
        <div 
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center border border-forest-500/30 group-hover:scale-105 transition-transform shadow-md">
            <Sprout className="w-6 h-6 text-forest-300" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
              Plant Care
            </span>
          </div>
        </div>

        {/* Navigation Items (Desktop & Tablets) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#141f17] p-1 rounded-xl border border-surface-border">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`px-2.5 lg:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePage === item.id 
                  ? 'bg-forest text-white shadow-sm font-semibold' 
                  : 'text-surface-muted hover:text-white hover:bg-surface-card'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: Outbreak Alert + User + Hamburger Button (=) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Outbreak Bell */}
          <button
            onClick={() => handleNavClick('outbreak')}
            className="p-2 rounded-xl bg-[#152018] border border-surface-border hover:bg-surface-card transition-colors relative"
            title="Outbreak Alerts within 25 km"
          >
            <ShieldAlert className="w-4 h-4 text-surface-muted hover:text-white transition-colors" />
            {outbreakCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-alert-red animate-pulse" />
            )}
          </button>

          {/* Clerk User Button or Profile avatar */}
          <div className="flex items-center shrink-0">
            {clerkUser ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div 
                onClick={() => handleNavClick('dashboard')}
                className="w-8 h-8 rounded-full bg-forest-700 border border-forest-500/40 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-forest-400 transition-all shrink-0"
              >
                🌾
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Button (=) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#152018] border border-surface-border text-white hover:bg-surface-card transition-all active:scale-95"
            aria-label="Toggle navigation menu"
            title="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-forest-300" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>

        </div>

      </div>

      {/* Mobile Navigation Dropdown Menu (=) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0c140e]/98 border-b border-surface-border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 space-y-1.5 max-w-7xl mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-surface-muted hover:text-white hover:bg-[#142318]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-forest-600 text-white' : 'bg-surface-dark text-forest-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-alert-red text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
