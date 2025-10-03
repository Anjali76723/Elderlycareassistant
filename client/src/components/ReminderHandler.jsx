// client/src/components/ReminderHandler.jsx
import React, { useEffect, useState, useContext } from 'react';
import { userDataContext } from '../context/UserContext';
import api from '../utils/axiosConfig';

const ReminderHandler = ({ onReminderReceived }) => {
  const { socket, userData } = useContext(userDataContext);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!socket || !userData) {
      console.log("🔌 ReminderHandler: No socket or userData available");
      setConnectionStatus('disconnected');
      return;
    }

    console.log("🔌 ReminderHandler: Setting up enhanced reminder listener");
    console.log("👤 ReminderHandler: User:", userData._id, "Role:", userData.role);
    setConnectionStatus('connected');

    // Enhanced reminder handler with better error handling
    const handleReminder = (reminderData) => {
      try {
        console.log("🔔 ReminderHandler: Received reminder event:", reminderData);
        console.log("🔔 ReminderHandler: Current time:", new Date().toISOString());
        
        // Validate reminder data
        if (!reminderData || !reminderData.message) {
          console.error("❌ ReminderHandler: Invalid reminder data received:", reminderData);
          return;
        }

        // Call the parent component's handler
        if (onReminderReceived && typeof onReminderReceived === 'function') {
          onReminderReceived(reminderData);
        } else {
          console.error("❌ ReminderHandler: No onReminderReceived handler provided");
        }

      } catch (error) {
        console.error("❌ ReminderHandler: Error processing reminder:", error);
      }
    };

    // Connection status handlers
    const handleConnect = () => {
      console.log("🔌 ReminderHandler: Socket connected, ID:", socket.id);
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      console.log("🔌 ReminderHandler: Socket disconnected");
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (error) => {
      console.error("❌ ReminderHandler: Socket connection error:", error);
      setConnectionStatus('error');
    };

    // Attach event listeners
    socket.on('reminder', handleReminder);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    console.log("✅ ReminderHandler: All event listeners attached");

    // Test socket connection
    if (socket.connected) {
      console.log("✅ ReminderHandler: Socket is already connected");
      setConnectionStatus('connected');
    } else {
      console.log("⚠️ ReminderHandler: Socket is not connected, attempting to connect...");
      socket.connect();
    }

    // Cleanup function
    return () => {
      console.log("🧹 ReminderHandler: Cleaning up event listeners");
      socket.off('reminder', handleReminder);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket, userData, onReminderReceived]);

  // Acknowledge reminder function
  const acknowledgeReminder = async (reminderId, action = 'taken', snoozeMinutes = 10) => {
    try {
      console.log(`🔔 ReminderHandler: Acknowledging reminder ${reminderId} with action: ${action}`);
      await api.post(`/api/reminder/ack/${reminderId}`, { action, snoozeMinutes });
      console.log("✅ ReminderHandler: Reminder acknowledged successfully");
      return true;
    } catch (error) {
      console.error("❌ ReminderHandler: Error acknowledging reminder:", error);
      return false;
    }
  };

  // Return connection status and acknowledge function for parent component
  return {
    connectionStatus,
    acknowledgeReminder
  };
};

export default ReminderHandler;
