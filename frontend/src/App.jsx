import React, { useState, useEffect } from 'react';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { translations } from './i18n/translations';
import { detectAndSyncUserLocation, getCachedUserLocation } from './services/location';
import { getOutbreakAlerts } from './api/client';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import TreatmentLoop from './pages/TreatmentLoop';
import Chat from './pages/Chat';
import Outbreak from './pages/Outbreak';
import History from './pages/History';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured = Boolean(CLERK_KEY && CLERK_KEY.startsWith("pk_"));

function PlantCareApp() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentLang, setCurrentLang] = useState('en');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [chatContext, setChatContext] = useState(() => {
    try {
      const stored = localStorage.getItem('plantcare_chat_context');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [outbreakCount, setOutbreakCount] = useState(0);
  const [userLocation, setUserLocation] = useState(getCachedUserLocation());
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('plantcare_theme');
      if (!stored || stored === 'cream') {
        localStorage.setItem('plantcare_theme', 'forest');
        return 'forest';
      }
      return stored;
    } catch (e) {
      return 'forest';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'forest' ? 'cream' : 'forest';
    setTheme(next);
    try {
      localStorage.setItem('plantcare_theme', next);
    } catch (e) {}
  };

  // Automatic GPS/Location detection when app loads or user logs in
  useEffect(() => {
    detectAndSyncUserLocation().then((loc) => {
      if (loc) setUserLocation(loc);
    });

    const handleLocationUpdate = (e) => {
      if (e.detail) setUserLocation(e.detail);
    };
    window.addEventListener('plantcare:location_updated', handleLocationUpdate);
    return () => window.removeEventListener('plantcare:location_updated', handleLocationUpdate);
  }, []);

  // Fetch active outbreak alerts within 30km and 7 days rolling window for notification badge
  useEffect(() => {
    let isMounted = true;
    const fetchOutbreakNotificationCount = async () => {
      try {
        const lat = userLocation?.lat || 11.6643;
        const lon = userLocation?.lon || 78.1460;
        const data = await getOutbreakAlerts(lat, lon, 30.0);
        if (isMounted) {
          setOutbreakCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (e) {
        if (isMounted) setOutbreakCount(0);
      }
    };
    fetchOutbreakNotificationCount();
    // Auto-refresh every 60 seconds so alerts older than 7 days auto-clear from notifications
    const interval = setInterval(fetchOutbreakNotificationCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userLocation?.lat, userLocation?.lon]);

  const t = translations[currentLang] || translations.en;

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatWithContext = (context) => {
    if (context) {
      setChatContext(context);
      try {
        localStorage.setItem('plantcare_chat_context', JSON.stringify(context));
      } catch (e) {}
    }
    navigateTo('chat');
  };

  const renderAppContent = () => (
    <>
      <Navbar
        currentLang={currentLang}
        onLangChange={setCurrentLang}
        t={t}
        onNavigate={navigateTo}
        activePage={currentPage}
        outbreakCount={outbreakCount}
        userLocation={userLocation}
        onRefreshLocation={detectAndSyncUserLocation}
      />

      <main className="flex-1">
        {currentPage === 'dashboard' && (
          <Dashboard 
            onNavigate={navigateTo} 
            t={t} 
            userLocation={userLocation}
            onSelectTreatment={(id) => { setSelectedPlanId(id); navigateTo('treatment'); }}
          />
        )}

        {currentPage === 'scan' && (
          <Scan 
            onNavigate={navigateTo} 
            t={t} 
            userLocation={userLocation}
            onOpenChat={handleOpenChatWithContext}
            onSelectTreatment={setSelectedPlanId}
          />
        )}

        {currentPage === 'treatment' && (
          <TreatmentLoop 
            onNavigate={navigateTo} 
            t={t} 
            selectedPlanId={selectedPlanId}
            onOpenChat={handleOpenChatWithContext}
            userLocation={userLocation}
          />
        )}

        {currentPage === 'chat' && (
          <Chat 
            onNavigate={navigateTo} 
            t={t} 
            chatContext={chatContext}
            currentLang={currentLang}
            onLangChange={setCurrentLang}
          />
        )}

        {currentPage === 'outbreak' && (
          <Outbreak 
            onNavigate={navigateTo} 
            t={t} 
            userLocation={userLocation}
          />
        )}

        {currentPage === 'history' && (
          <History 
            onNavigate={navigateTo} 
            t={t} 
            onSelectTreatment={(id) => { setSelectedPlanId(id); navigateTo('treatment'); }}
          />
        )}
      </main>

      <BottomNav 
        activePage={currentPage} 
        onNavigate={navigateTo} 
        t={t} 
        outbreakCount={outbreakCount} 
      />
    </>
  );

  return (
    <div className={`min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200 ${
      theme === 'cream' ? 'theme-cream bg-[#f7f4ee] text-[#1e351e]' : 'theme-forest bg-[#132214] text-[#f7f4ee]'
    }`}>
      {currentPage === 'landing' ? (
        <main className="flex-1">
          <Landing 
            onNavigate={navigateTo} 
            t={t} 
          />
        </main>
      ) : (
        isClerkConfigured ? (
          <>
            <SignedIn>
              {renderAppContent()}
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        ) : (
          renderAppContent()
        )
      )}
    </div>
  );
}

export default function App() {
  if (CLERK_KEY && CLERK_KEY.startsWith("pk_")) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <PlantCareApp />
      </ClerkProvider>
    );
  }
  return <PlantCareApp />;
}
