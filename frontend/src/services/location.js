import api from '../api/client';

const STORAGE_KEY = 'plantcare_user_location';
const DEFAULT_LOCATION = {
  lat: 12.9725,
  lon: 79.1610,
  city: "Katpadi, IN",
  accuracy: "default",
  source: "default"
};

export function stripAccents(str) {
  if (!str || typeof str !== 'string') return str || '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Client-side reverse geocoding to retrieve actual city / district name
 */
export async function reverseGeocodeCity(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const place = data.locality || data.city || data.principalSubdivision;
      const country = data.countryCode || data.countryName || "";
      if (place && country) return `${place}, ${country}`;
      if (place) return place;
    }
  } catch (e) {}

  // Fallback: OpenStreetMap Nominatim
  try {
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { signal: AbortSignal.timeout(3500), headers: { 'User-Agent': 'PlantCareApp/1.0' } }
    );
    if (res2.ok) {
      const d2 = await res2.json();
      const addr = d2.address || {};
      const place = addr.suburb || addr.town || addr.city || addr.county || addr.state;
      const country = addr.country_code ? addr.country_code.toUpperCase() : "IN";
      if (place) return `${place}, ${country}`;
    }
  } catch (e) {}

  return null;
}

/**
 * Returns currently cached location or regional default
 */
export function getCachedUserLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lat && parsed.lon) {
        if (parsed.city) parsed.city = stripAccents(parsed.city);
        // Replace invalid placeholder strings like 'GPS' with real location name
        if (!parsed.city || parsed.city.toUpperCase().trim() === "GPS" || parsed.city.includes("Farm GPS") || parsed.city.includes("Auto Farm")) {
          parsed.city = "Katpadi, IN";
        }
        parsed.source = parsed.source || "default";
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_LOCATION;
}

/**
 * Persists location in localStorage and notifies subscribers
 */
export function saveCachedUserLocation(loc) {
  try {
    let cleanCity = stripAccents(loc?.city);
    if (!cleanCity || cleanCity.toUpperCase().trim() === "GPS" || cleanCity.includes("Farm GPS") || cleanCity.includes("Auto Farm")) {
      cleanCity = "Katpadi, IN";
    }
    const cleanLoc = {
      ...loc,
      city: cleanCity,
      source: loc?.source || "default"
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLoc));
    window.dispatchEvent(new CustomEvent('plantcare:location_updated', { detail: cleanLoc }));
  } catch (e) {}
}

/**
 * Automatically detects location via browser GPS with fallback to IP-based location,
 * then syncs coordinates with backend.
 */
export async function detectAndSyncUserLocation() {
  return new Promise((resolve) => {
    // 1. Try Browser HTML5 Geolocation (High Accuracy)
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(4));
          const lon = Number(position.coords.longitude.toFixed(4));
          
          // Reverse geocode coordinates to find human-readable city/district name
          const detectedCity = await reverseGeocodeCity(lat, lon);
          const initialCity = detectedCity || "Katpadi, IN";

          const synced = await syncLocationWithBackend(lat, lon, initialCity, "GPS");
          if (!synced.city || synced.city.toUpperCase().trim() === "GPS" || synced.city.includes("Farm GPS")) {
            synced.city = initialCity;
          }
          synced.source = "GPS";
          saveCachedUserLocation(synced);
          resolve(synced);
        },
        async (err) => {
          console.warn("Browser GPS unavailable or denied. Falling back to IP-based location:", err.message);
          const ipLoc = await fetchLocationFromIP();
          const targetSource = ipLoc.source === "default" ? "default" : "IP";
          const synced = await syncLocationWithBackend(ipLoc.lat, ipLoc.lon, ipLoc.city, targetSource);
          if (!synced.city || synced.city.toUpperCase().trim() === "GPS") {
            synced.city = ipLoc.city || "Katpadi, IN";
          }
          synced.source = targetSource;
          saveCachedUserLocation(synced);
          resolve(synced);
        },
        { timeout: 7000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    } else {
      // 2. Fallback to IP geolocation if navigator.geolocation not supported
      fetchLocationFromIP().then(async (ipLoc) => {
        const targetSource = ipLoc.source === "default" ? "default" : "IP";
        const synced = await syncLocationWithBackend(ipLoc.lat, ipLoc.lon, ipLoc.city, targetSource);
        if (!synced.city || synced.city.toUpperCase().trim() === "GPS") {
          synced.city = ipLoc.city || "Katpadi, IN";
        }
        synced.source = targetSource;
        saveCachedUserLocation(synced);
        resolve(synced);
      });
    }
  });
}

/**
 * Fallback to IP-based geolocation
 */
async function fetchLocationFromIP() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const city = data.city ? `${data.city}, ${data.region_code || data.country_name}` : "Katpadi, IN";
        return {
          lat: Number(data.latitude.toFixed(4)),
          lon: Number(data.longitude.toFixed(4)),
          city: city,
          accuracy: "IP",
          source: "IP"
        };
      }
    }
  } catch (e) {
    console.debug("IP geolocation fetch fallback error:", e);
  }
  return DEFAULT_LOCATION;
}

/**
 * Syncs coordinates to backend to resolve city and weather info
 */
async function syncLocationWithBackend(latitude, longitude, preferredCity = null, source = "default") {
  try {
    const res = await api.post('/api/dashboard/user/location', {
      latitude: latitude,
      longitude: longitude,
      city: preferredCity
    });
    if (res.data && res.data.latitude && res.data.longitude) {
      let resolved = stripAccents(res.data.city || preferredCity || "Katpadi, IN");
      if (!resolved || resolved.toUpperCase().trim() === "GPS" || resolved.includes("Farm GPS")) {
        resolved = preferredCity || "Katpadi, IN";
      }
      return {
        lat: res.data.latitude,
        lon: res.data.longitude,
        city: resolved,
        weather: res.data.weather,
        accuracy: "Live",
        source: source
      };
    }
  } catch (err) {
    console.warn("Backend location sync warning:", err);
  }

  let fallbackCity = stripAccents(preferredCity || "Katpadi, IN");
  if (!fallbackCity || fallbackCity.toUpperCase().trim() === "GPS") {
    fallbackCity = "Katpadi, IN";
  }

  return {
    lat: latitude,
    lon: longitude,
    city: fallbackCity,
    accuracy: "Cached",
    source: source
  };
}
