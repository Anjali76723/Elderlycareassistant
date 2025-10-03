// client/src/utils/caregiverFix.js
// Fixed caregiver management functions

export const fixedHandleSubmit = async (e, { 
  formData, 
  editingId, 
  api, 
  toast, 
  setFormData, 
  setEditingId, 
  fetchCaregivers 
}) => {
  e.preventDefault();
  console.log("🔧 Submitting caregiver form:", formData);
  
  try {
    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields (name, email, phone)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate phone format (basic check)
    const phoneRegex = /^\+?\d{8,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid phone number (e.g., +919876543210)');
      return;
    }

    if (editingId) {
      console.log("📝 Updating caregiver:", editingId);
      await api.put(`/api/caregivers/${editingId}`, formData);
      toast.success('Caregiver updated successfully');
    } else {
      console.log("➕ Adding new caregiver");
      console.log("📤 Request data:", formData);
      const response = await api.post('/api/caregivers', formData);
      console.log("✅ Caregiver added successfully:", response.data);
      toast.success('Caregiver added successfully');
    }
    
    // Reset form and refresh list
    setFormData({
      name: '',
      email: '',
      phone: '',
      receiveSMS: true,
      isPrimary: false
    });
    setEditingId(null);
    fetchCaregivers();
    
  } catch (error) {
    console.error('❌ Error saving caregiver:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to save caregiver';
    toast.error(errorMessage);
  }
};

// Enhanced fetch caregivers function
export const fixedFetchCaregivers = async ({ 
  api, 
  setCaregivers, 
  setIsLoading, 
  toast, 
  logout 
}) => {
  try {
    console.log("📥 Fetching caregivers...");
    setIsLoading(true);
    
    const response = await api.get('/api/caregivers');
    console.log("✅ Caregivers fetched:", response.data);
    
    if (response.data && Array.isArray(response.data)) {
      setCaregivers(response.data);
    } else {
      console.error('❌ Unexpected response format:', response.data);
      toast.error('Error loading caregivers. Please try again.');
    }
  } catch (error) {
    console.error('❌ Error fetching caregivers:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    
    if (error.response?.status === 401) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('token');
      logout();
    } else {
      toast.error(error.response?.data?.message || 'Failed to load caregivers');
    }
  } finally {
    setIsLoading(false);
  }
};
