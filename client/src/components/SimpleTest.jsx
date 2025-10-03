// client/src/components/SimpleTest.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const SimpleTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setResults(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addLog('🧪 Starting direct fetch test...');
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        addLog('❌ No token found');
        return;
      }
      addLog('✅ Token found');

      // Test with direct fetch API
      const apiUrl = 'https://elderlycareassistant.onrender.com';
      addLog(`📡 Testing direct fetch to: ${apiUrl}`);

      // Test GET first
      addLog('📥 Testing GET /api/caregivers...');
      const getResponse = await fetch(`${apiUrl}/api/caregivers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        addLog(`❌ GET failed: ${getResponse.status} - ${errorText}`);
      } else {
        const getData = await getResponse.json();
        addLog(`✅ GET successful: Found ${getData.length} caregivers`);
        addLog(`📋 Existing caregivers: ${JSON.stringify(getData.map(c => ({name: c.name, email: c.email, phone: c.phone})))}`);
      }

      // Test POST with unique data
      const uniqueId = Date.now();
      const testCaregiver = {
        name: `Test User ${uniqueId}`,
        email: `test${uniqueId}@example.com`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        receiveSMS: true,
        isPrimary: false
      };

      addLog('📤 Testing POST /api/caregivers...');
      addLog(`📤 Data: ${JSON.stringify(testCaregiver)}`);

      const postResponse = await fetch(`${apiUrl}/api/caregivers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(testCaregiver)
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        addLog(`❌ POST failed: ${postResponse.status} - ${errorText}`);
        
        try {
          const errorJson = JSON.parse(errorText);
          addLog(`❌ Error details: ${JSON.stringify(errorJson)}`);
        } catch (e) {
          addLog(`❌ Raw error: ${errorText}`);
        }
      } else {
        const postData = await postResponse.json();
        addLog(`✅ POST successful: ${JSON.stringify(postData)}`);
        toast.success('Test caregiver added successfully!');
        
        // Clean up - delete the test caregiver
        if (postData._id) {
          const deleteResponse = await fetch(`${apiUrl}/api/caregivers/${postData._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (deleteResponse.ok) {
            addLog(`🧹 Test caregiver cleaned up`);
          }
        }
      }

    } catch (error) {
      addLog(`❌ Network error: ${error.message}`);
      console.error('Full error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 w-96 bg-white border-2 border-green-500 rounded-lg shadow-lg p-4 z-50 max-h-96 overflow-hidden flex flex-col">
      <h3 className="text-lg font-bold text-green-600 mb-3">🔧 Direct API Test</h3>
      
      <button
        onClick={testDirectFetch}
        disabled={loading}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 mb-3"
      >
        {loading ? 'Testing...' : '🧪 Test Direct API Call'}
      </button>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
        {results.length === 0 ? (
          <p className="text-gray-500">Click test button to start...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} className="mb-1 text-gray-700">
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SimpleTest;
