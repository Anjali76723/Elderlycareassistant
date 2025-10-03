// client/src/utils/reminderDebug.js
// Enhanced debugging utilities for reminder system

export const debugReminder = {
  // Log reminder reception with enhanced details
  logReminderReceived: (reminder, socket, userData) => {
    console.log("🔔🔔🔔 ENHANCED DEBUG: Reminder received!", {
      reminder,
      socketId: socket?.id,
      socketConnected: socket?.connected,
      userId: userData?._id,
      userRole: userData?.role,
      timestamp: new Date().toISOString()
    });
  },

  // Log socket connection status
  logSocketStatus: (socket, userData) => {
    console.log("🔌🔌🔌 ENHANCED DEBUG: Socket status check", {
      socketExists: !!socket,
      socketId: socket?.id,
      socketConnected: socket?.connected,
      userId: userData?._id,
      userRole: userData?.role,
      timestamp: new Date().toISOString()
    });
  },

  // Test reminder display manually
  testReminderDisplay: (setCurrentReminder, speakText) => {
    console.log("🧪🧪🧪 MANUAL TEST: Triggering test reminder");
    const testReminder = {
      id: "test-" + Date.now(),
      message: "Test reminder - this is a manual test",
      time: new Date().toISOString(),
      meta: {}
    };
    
    setCurrentReminder(testReminder);
    if (speakText) {
      speakText(`Test reminder: ${testReminder.message}`, "en-IN");
    }
    
    return testReminder;
  },

  // Check if reminder listener is properly attached
  checkReminderListener: (socket) => {
    if (!socket) {
      console.error("❌❌❌ DEBUG: No socket available for reminder listening");
      return false;
    }

    const listeners = socket.listeners('reminder');
    console.log("🔍🔍🔍 DEBUG: Reminder listeners count:", listeners.length);
    
    if (listeners.length === 0) {
      console.error("❌❌❌ DEBUG: No reminder listeners attached to socket!");
      return false;
    }
    
    console.log("✅✅✅ DEBUG: Reminder listeners are properly attached");
    return true;
  }
};

// Global debug function for manual testing
window.debugReminder = debugReminder;
