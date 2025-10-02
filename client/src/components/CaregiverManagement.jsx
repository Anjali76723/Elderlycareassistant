import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { userDataContext } from '../context/UserContext';

const CaregiverManagement = () => {
  const { serverUrl } = useContext(userDataContext);
  const [caregivers, setCaregivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    receiveSMS: true,
    receiveEmail: true,
    isPrimary: false
  });
  const [editingId, setEditingId] = useState(null);

  // Fetch caregivers on component mount
  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${serverUrl}/api/caregivers`, { 
        withCredentials: true 
      });
      setCaregivers(response.data);
    } catch (error) {
      console.error('Error fetching caregivers:', error);
      toast.error(error.response?.data?.message || 'Failed to load caregivers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting caregiver form:', formData);
    console.log('Editing ID:', editingId);
    
    try {
      if (editingId) {
        console.log('Updating caregiver:', editingId);
        const response = await axios.put(
          `${serverUrl}/api/caregivers/${editingId}`, 
          formData, 
          { withCredentials: true }
        );
        console.log('Update response:', response.data);
        toast.success('Caregiver updated successfully');
      } else {
        console.log('Adding new caregiver');
        const response = await axios.post(
          `${serverUrl}/api/caregivers`, 
          formData, 
          { withCredentials: true }
        );
        console.log('Add response:', response.data);
        toast.success('Caregiver added successfully');
      }
      
      // Reset form
      console.log('Resetting form');
      setFormData({
        name: '',
        email: '',
        phone: '',
        receiveSMS: true,
        receiveEmail: true,
        isPrimary: false
      });
      setEditingId(null);
      setIsModalOpen(false);
      
      // Refresh list
      console.log('Fetching updated caregiver list');
      await fetchCaregivers();
    } catch (error) {
      console.error('Error saving caregiver:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save caregiver');
    }
  };

  const handleEdit = (caregiver) => {
    setFormData({
      name: caregiver.name,
      email: caregiver.email,
      phone: caregiver.phone,
      receiveSMS: caregiver.receiveSMS,
      receiveEmail: caregiver.receiveEmail,
      isPrimary: caregiver.isPrimary
    });
    setEditingId(caregiver._id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this caregiver?')) {
      try {
        await axios.delete(
          `${serverUrl}/api/caregivers/${id}`, 
          { withCredentials: true }
        );
        toast.success('Caregiver removed successfully');
        fetchCaregivers();
      } catch (error) {
        console.error('Error deleting caregiver:', error);
        toast.error(error.response?.data?.message || 'Failed to remove caregiver');
      }
    }
  };

  const sendTestSMS = async (id) => {
    try {
      await axios.post(
        `${serverUrl}/api/caregivers/${id}/test-sms`, 
        {}, 
        { withCredentials: true }
      );
      toast.success('Test SMS sent successfully');
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast.error(error.response?.data?.message || 'Failed to send test SMS');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Caregivers</h2>
        <button
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              phone: '',
              receiveSMS: true,
              receiveEmail: true,
              isPrimary: false
            });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Caregiver
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : caregivers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No caregivers added yet. Click "Add Caregiver" to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {caregivers.map((caregiver) => (
                <tr key={caregiver._id} className={caregiver.isPrimary ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {caregiver.name}
                          {caregiver.isPrimary && (
                            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caregiver.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caregiver.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col space-y-1">
                      {caregiver.receiveSMS && <span className="text-green-600">SMS</span>}
                      {caregiver.receiveEmail && <span className="text-green-600">Email</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(caregiver)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(caregiver._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                      {caregiver.receiveSMS && (
                        <button
                          onClick={() => sendTestSMS(caregiver._id)}
                          className="text-green-600 hover:text-green-900 text-xs"
                          title="Send Test SMS"
                        >
                          Test SMS
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Caregiver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Caregiver' : 'Add New Caregiver'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="receiveSMS"
                      name="receiveSMS"
                      type="checkbox"
                      checked={formData.receiveSMS}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="receiveSMS" className="ml-2 block text-sm text-gray-700">
                      Receive SMS Alerts
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="receiveEmail"
                      name="receiveEmail"
                      type="checkbox"
                      checked={formData.receiveEmail}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="receiveEmail" className="ml-2 block text-sm text-gray-700">
                      Receive Email Alerts
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="isPrimary"
                      name="isPrimary"
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-700">
                      Set as Primary Caregiver
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingId ? 'Update' : 'Add'} Caregiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverManagement;
