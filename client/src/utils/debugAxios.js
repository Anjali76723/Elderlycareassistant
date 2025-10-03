// client/src/utils/debugAxios.js
import axios from 'axios';

// Debug function to test API connectivity
export const debugAPI = async () => {
  console.log('🔍 === API DEBUG ANALYSIS ===');
  
  // Check environment variables
  console.log('🌍 Environment Variables:');
  console.log('- VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('- NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('- MODE:', import.meta.env.MODE);
  
  // Check localStorage
  const token = localStorage.getItem('token');
  console.log('🔑 Authentication:');
  console.log('- Token exists:', !!token);
  console.log('- Token length:', token ? token.length : 0);
  console.log('- Token preview:', token ? token.substring(0, 20) + '...' : 'None');
  
  // Test different API URLs
  const testUrls = [
    'https://elderlycareassistant.onrender.com',
    'http://localhost:8000',
    import.meta.env.VITE_API_URL
  ].filter(Boolean);
  
  console.log('🌐 Testing API URLs:');
  
  for (const baseURL of testUrls) {
    console.log(`\n📡 Testing: ${baseURL}`);
    
    try {
      // Test basic connectivity
      const testApi = axios.create({
        baseURL,
        timeout: 5000,
        withCredentials: true
      });
      
      // Add auth header if token exists
      if (token) {
        testApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Test health endpoint
      console.log('  ⏳ Testing health endpoint...');
      const healthResponse = await testApi.get('/');
      console.log('  ✅ Health check:', healthResponse.data);
      
      // Test caregivers endpoint
      console.log('  ⏳ Testing caregivers endpoint...');
      const caregiversResponse = await testApi.get('/api/caregivers');
      console.log('  ✅ Caregivers GET:', caregiversResponse.data.length, 'caregivers');
      
      // Test POST caregivers
      console.log('  ⏳ Testing caregivers POST...');
      const testCaregiver = {
        name: 'Debug Test Caregiver',
        email: 'debug@test.com',
        phone: '+919999999999',
        receiveSMS: true,
        isPrimary: false
      };
      
      const postResponse = await testApi.post('/api/caregivers', testCaregiver);
      console.log('  ✅ Caregivers POST successful:', postResponse.data);
      
      // Clean up test data
      if (postResponse.data._id) {
        await testApi.delete(`/api/caregivers/${postResponse.data._id}`);
        console.log('  🧹 Test caregiver cleaned up');
      }
      
      console.log(`  🎉 ${baseURL} - ALL TESTS PASSED!`);
      return { success: true, workingUrl: baseURL };
      
    } catch (error) {
      console.log(`  ❌ ${baseURL} - FAILED:`, error.response?.status, error.response?.data?.message || error.message);
    }
  }
  
  console.log('\n❌ All API URLs failed!');
  return { success: false };
};

// Enhanced axios instance with better error handling
export const createDebugAPI = () => {
  const baseURL = import.meta.env.VITE_API_URL || "https://elderlycareassistant.onrender.com";
  
  console.log('🔧 Creating API instance with baseURL:', baseURL);
  
  const api = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 15000, // Increased timeout for production
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Enhanced request interceptor
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
      console.log('📤 Base URL:', config.baseURL);
      console.log('📤 Full URL:', `${config.baseURL}${config.url}`);
      console.log('📤 Token:', token ? 'Present' : 'Missing');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Enhanced response interceptor
  api.interceptors.response.use(
    (response) => {
      console.log('📥 API Response:', response.status, response.config.url);
      console.log('📥 Response Data:', response.data);
      return response;
    },
    (error) => {
      console.error('❌ API Error:', error.response?.status, error.config?.url);
      console.error('❌ Error Data:', error.response?.data);
      console.error('❌ Error Message:', error.message);
      
      if (error.response?.status === 401) {
        const requestUrl = error.config?.url || '';
        const isAuthRequest = requestUrl.includes('/auth/');
        
        if (!isAuthRequest) {
          console.log('🔐 Token expired, clearing localStorage');
          localStorage.removeItem('token');
          if (!window.location.pathname.includes('/signin')) {
            window.location.href = '/signin';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

export default createDebugAPI();
