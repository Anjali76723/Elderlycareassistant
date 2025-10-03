// client/src/components/CaregiverDebugger.jsx
import React, { useState } from 'react';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';

const CaregiverDebugger = () => {
  const [testData, setTestData] = useState({
    name: 'Test Caregiver',
    email: 'test@example.com',
    phone: '+919876543210',
    receiveSMS: true,
    isPrimary: false
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testAddCaregiver = async () => {
    setLoading(true);
    setResults([]);
    addLog('🧪 Starting caregiver test...', 'info');

    try {
      // Test 1: Check authentication
      addLog('🔐 Testing authentication...', 'info');
      const token = localStorage.getItem('token');
      if (!token) {
        addLog('❌ No token found in localStorage', 'error');
        return;
      }
      addLog('✅ Token found in localStorage', 'success');

      // Test 2: Check API configuration
      addLog('🔧 Testing API configuration...', 'info');
      addLog(`API Base URL: ${api.defaults.baseURL}`, 'info');

      // Test 3: Test GET request first
      addLog('📥 Testing GET /api/caregivers...', 'info');
      try {
        const getResponse = await api.get('/api/caregivers');
        addLog(`✅ GET successful: ${getResponse.data.length} caregivers found`, 'success');
      } catch (getError) {
        addLog(`❌ GET failed: ${getError.response?.status} - ${getError.response?.data?.message || getError.message}`, 'error');
      }

      // Test 4: Test POST request
      addLog('📤 Testing POST /api/caregivers...', 'info');
      addLog(`Request data: ${JSON.stringify(testData)}`, 'info');
      
      const postResponse = await api.post('/api/caregivers', testData);
      addLog(`✅ POST successful: ${JSON.stringify(postResponse.data)}`, 'success');
      toast.success('Test caregiver added successfully!');

      // Test 5: Verify the caregiver was added
      addLog('🔍 Verifying caregiver was added...', 'info');
      const verifyResponse = await api.get('/api/caregivers');
      addLog(`✅ Verification: ${verifyResponse.data.length} caregivers now exist`, 'success');

    } catch (error) {
      addLog(`❌ Test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`, 'error');
      addLog(`Full error: ${JSON.stringify(error.response?.data)}`, 'error');
      
      if (error.response?.status === 401) {
        addLog('🔐 Authentication failed - token may be invalid', 'error');
      }
      
      toast.error('Test failed - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const testDeleteAllCaregivers = async () => {
    setLoading(true);
    addLog('🗑️ Testing delete all caregivers...', 'info');

    try {
      const response = await api.get('/api/caregivers');
      const caregivers = response.data;
      
      for (const caregiver of caregivers) {
        await api.delete(`/api/caregivers/${caregiver._id}`);
        addLog(`✅ Deleted caregiver: ${caregiver.name}`, 'success');
      }
      
      toast.success('All test caregivers deleted');
    } catch (error) {
      addLog(`❌ Delete failed: ${error.message}`, 'error');
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 z-50">
      <h3 className="text-lg font-bold text-blue-600 mb-3">🔧 Caregiver Debugger</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testAddCaregiver}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : '🧪 Test Add Caregiver'}
        </button>
        
        <button
          onClick={testDeleteAllCaregivers}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          🗑️ Clean Test Data
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
        {results.length === 0 ? (
          <p className="text-gray-500">No test results yet...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} className={`mb-1 ${
              result.type === 'error' ? 'text-red-600' : 
              result.type === 'success' ? 'text-green-600' : 
              'text-gray-700'
            }`}>
              <span className="text-gray-400">[{result.timestamp}]</span> {result.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaregiverDebugger;
