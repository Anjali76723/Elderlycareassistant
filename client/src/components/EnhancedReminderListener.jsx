// client/src/components/EnhancedReminderListener.jsx
import React, { useEffect, useContext } from 'react';
import { userDataContext } from '../context/UserContext';

const EnhancedReminderListener = ({ onReminderReceived, currentReminder, setCurrentReminder }) => {
  const { socket, userData } = useContext(userDataContext);

  useEffect(() => {
    if (!socket) {
      console.log("🔌 EnhancedReminderListener: No socket available");
      return;
    }

    if (!userData) {
      console.log("👤 EnhancedReminderListener: No userData available");
      return;
    }

    console.log("🔌 EnhancedReminderListener: Setting up enhanced reminder system");
    console.log("👤 EnhancedReminderListener: User ID:", userData._id, "Role:", userData.role);
    console.log("🔌 EnhancedReminderListener: Socket ID:", socket.id, "Connected:", socket.connected);

    // Enhanced reminder handler with comprehensive logging
    const handleReminder = (reminderData) => {
      console.log("🔔🔔🔔 REMINDER RECEIVED! Full data:", reminderData);
      console.log("🔔🔔🔔 REMINDER RECEIVED! Time:", new Date().toISOString());
      console.log("🔔🔔🔔 REMINDER RECEIVED! Socket:", socket.id);
      console.log("🔔🔔🔔 REMINDER RECEIVED! User:", userData._id);

      try {
        // Validate reminder data
        if (!reminderData) {
          console.error("❌ EnhancedReminderListener: Null reminder data received");
          return;
        }

        if (!reminderData.message) {
          console.error("❌ EnhancedReminderListener: Reminder missing message:", reminderData);
          return;
        }

        console.log("✅ EnhancedReminderListener: Reminder data is valid, processing...");

        // Set the reminder in state
        if (setCurrentReminder) {
          setCurrentReminder(reminderData);
          console.log("✅ EnhancedReminderListener: Reminder set in state");
        }

        // Call parent handler if provided
        if (onReminderReceived && typeof onReminderReceived === 'function') {
          onReminderReceived(reminderData);
          console.log("✅ EnhancedReminderListener: Parent handler called");
        }

        // Force a visual alert
        alert(`REMINDER: ${reminderData.message}`);
        console.log("✅ EnhancedReminderListener: Alert shown");

        // Try to speak the reminder
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(`Reminder: ${reminderData.message}`);
          utterance.lang = 'en-IN';
          utterance.rate = 0.8;
          utterance.volume = 1;
          window.speechSynthesis.speak(utterance);
          console.log("✅ EnhancedReminderListener: Speech synthesis triggered");
        }

      } catch (error) {
        console.error("❌ EnhancedReminderListener: Error processing reminder:", error);
      }
    };

    // Connection handlers
    const handleConnect = () => {
      console.log("🔌 EnhancedReminderListener: Socket connected:", socket.id);
    };

    const handleDisconnect = () => {
      console.log("🔌 EnhancedReminderListener: Socket disconnected");
    };

    const handleError = (error) => {
      console.error("❌ EnhancedReminderListener: Socket error:", error);
    };

    // Attach all event listeners
    socket.on('reminder', handleReminder);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    console.log("✅ EnhancedReminderListener: All event listeners attached");

    // Test the connection immediately
    if (socket.connected) {
      console.log("✅ EnhancedReminderListener: Socket is connected and ready");
    } else {
      console.log("⚠️ EnhancedReminderListener: Socket not connected, will wait for connection");
    }

    // Add a test function to window for manual testing
    window.testReminderSystem = () => {
      console.log("🧪 Manual reminder test triggered");
      const testReminder = {
        id: "manual-test-" + Date.now(),
        message: "Manual test reminder - if you see this, the system works!",
        time: new Date().toISOString(),
        meta: {}
      };
      handleReminder(testReminder);
    };

    console.log("🧪 Added window.testReminderSystem() for manual testing");

    // Cleanup function
    return () => {
      console.log("🧹 EnhancedReminderListener: Cleaning up event listeners");
      socket.off('reminder', handleReminder);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      delete window.testReminderSystem;
    };
  }, [socket, userData, onReminderReceived, setCurrentReminder]);

  // Render connection status
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: socket?.connected ? 'green' : 'red', 
      color: 'white', 
      padding: '5px 10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      Socket: {socket?.connected ? 'Connected' : 'Disconnected'}
      {userData && ` | User: ${userData._id}`}
    </div>
  );
};

export default EnhancedReminderListener;
