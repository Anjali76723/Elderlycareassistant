// client/src/utils/axiosConfig.js
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true, // Keep this for cookie support
  timeout: 10000
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
      console.log('Token expired or invalid, clearing localStorage');
      localStorage.removeItem('token');
      // Optionally redirect to login
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default api;
