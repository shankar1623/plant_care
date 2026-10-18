import axios from 'axios';

const getEffectiveApiBase = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

  // In production (Render or custom domain)
  if (!isLocalhost && hostname.includes('onrender.com')) {
    // If running on backend host itself, relative paths work
    if (hostname.includes('plant-care-p185')) {
      return '';
    }
    // Static frontend hosted on plantcare-euxx or other Render subdomain
    return 'https://plant-care-p185.onrender.com';
  }

  // Local development fallback
  if (envUrl && !envUrl.includes('placeholder')) {
    return envUrl;
  }
  return isLocalhost ? 'http://localhost:8000' : '';
};

const api = axios.create({
  baseURL: getEffectiveApiBase(),
});

const isDevUserAllowed = import.meta.env.VITE_ALLOW_DEV_USER === "true";

export const getActiveUserId = () => {
  if (!isDevUserAllowed) {
    return null;
  }
  try {
    if (window.Clerk?.user?.id) {
      return `clerk_${window.Clerk.user.id}`;
    }
  } catch (e) {}

  let localId = localStorage.getItem('plantcare_user_id');
  if (!localId) {
    // Fresh isolated ID for a new user account
    localId = 'usr_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);
    localStorage.setItem('plantcare_user_id', localId);
    localStorage.setItem('plantcare_user_name', 'New Farmer');
  }
  return localId;
};

// Interceptor to automatically attach Clerk Bearer token & X-User-Id header (if dev user allowed)
api.interceptors.request.use(async (config) => {
  try {
    if (window.Clerk?.session) {
      const token = await window.Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // Non-blocking in case Clerk is uninitialized
  }

  if (isDevUserAllowed) {
    const userId = getActiveUserId();
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        if (window.Clerk?.openSignIn) {
          window.Clerk.openSignIn();
        } else if (window.Clerk?.redirectToSignIn) {
          window.Clerk.redirectToSignIn();
        }
      } catch (e) {}
    }
    return Promise.reject(error);
  }
);

// 1. Detection
export const detectLeaf = async (formData) => {
  const res = await api.post('/api/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

// 2. Treatment Loop
export const startTreatment = async (diagnosisId) => {
  const formData = new FormData();
  formData.append('diagnosis_id', diagnosisId);
  const res = await api.post('/api/treatment/start', formData);
  return res.data;
};

export const checkinTreatment = async (treatmentId, file, dayNumber = null) => {
  const formData = new FormData();
  formData.append('treatment_id', treatmentId);
  formData.append('file', file);
  if (dayNumber !== null) {
    formData.append('day_number', dayNumber);
  }
  const res = await api.post('/api/treatment/checkin', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getTreatments = async () => {
  const res = await api.get('/api/treatment');
  return res.data;
};

export const getTreatmentDetail = async (id) => {
  const res = await api.get(`/api/treatment/${id}`);
  return res.data;
};

export const markTreatmentDone = async (id) => {
  const res = await api.post(`/api/treatment/${id}/done`);
  return res.data;
};

// 3. AI Chatbot
export const sendChatMessage = async (chatData) => {
  const res = await api.post('/api/chat', chatData);
  return res.data;
};

// 4. Outbreak Alerts (Strictly 30km radius & 7-day rolling window)
export const getOutbreakAlerts = async (lat = 11.6643, lon = 78.1460, radius = 30.0) => {
  const res = await api.get('/api/outbreak/alerts', {
    params: { latitude: lat, longitude: lon, radius_km: radius }
  });
  return res.data;
};


// 5. Scan History
export const getScanHistory = async () => {
  const res = await api.get('/api/detect/history');
  return res.data;
};

// Dashboard Stats
export const getDashboardStats = async (lat = 11.6643, lon = 78.1460) => {
  const res = await api.get('/api/dashboard/stats', {
    params: { latitude: lat, longitude: lon }
  });
  return res.data;
};

// Helper to resolve full image URLs across local, relative, and separate domain deployments
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

  // If already absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // If an image URL mistakenly contains localhost while running in production, redirect it to production backend
    if (!isLocalhost && (path.includes('localhost:8000') || path.includes('127.0.0.1:8000'))) {
      const relativePart = path.split(/localhost:8000|127\.0\.0\.1:8000/)[1] || '';
      return `https://plant-care-p185.onrender.com${relativePart.startsWith('/') ? relativePart : '/' + relativePart}`;
    }
    return path;
  }

  let base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  if (!isLocalhost && hostname.includes('onrender.com')) {
    base = 'https://plant-care-p185.onrender.com';
  } else if (!base && isLocalhost) {
    base = 'http://localhost:8000';
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default api;
