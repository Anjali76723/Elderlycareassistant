// client/src/utils/axiosConfig.js
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: "https://elderlycareassistant.onrender.com", // Direct URL to ensure it works
  withCredentials: true, // Keep this for cookie support
  timeout: 15000, // Increased timeout for production
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔍 Axios interceptor running for:', config.url);
    console.log('🔑 Token found:', token ? 'YES' : 'NO');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Adding Authorization header to request');
    } else {
      console.log('❌ No token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      
      // Don't redirect if this is a login/signup request (these are supposed to fail without token)
      const isAuthRequest = requestUrl.includes('/auth/signin') || 
                           requestUrl.includes('/auth/signup') || 
                           requestUrl.includes('/auth/pin-login');
      
      if (!isAuthRequest) {
        console.log('Token expired or invalid, clearing localStorage and redirecting');
        localStorage.removeItem('token');
        
        // Only redirect if we're not already on the signin page
        if (!window.location.pathname.includes('/signin')) {
          window.location.href = '/signin';
        }
      } else {
        console.log('401 on auth request - this is expected for login/signup');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
