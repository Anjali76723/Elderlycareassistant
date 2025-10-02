// client/src/context/UserContext.jsx
import React, { createContext, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export const userDataContext = createContext();

function UserContext({ children }) {
  const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [socket, setSocket] = useState(null);

  // fetch current user
  const handleCurrentUser = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/user/current`, { withCredentials: true });
      setUserData(res.data);
    } catch (err) {
      console.log("handleCurrentUser error:", err?.response?.data || err.message || err);
      setUserData(null);
    }
  };

  useEffect(() => {
    handleCurrentUser();
  }, []);

  // Request notification permission
  useEffect(() => {
    if (userData && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission().then((perm) => {
        console.log("Notification permission:", perm);
      });
    }
  }, [userData]);

  // create socket after we have userData
  useEffect(() => {
    if (!userData) return;

    const s = io(serverUrl, { transports: ["websocket"], withCredentials: true });
    setSocket(s);

    const onConnect = () => {
      console.log("client: socket connected", s.id);
      s.emit("join", userData._id);
      if (userData.role === "caregiver") {
        s.emit("join-caregiver", userData._id);
      }
    };

    const onDisconnect = () => {
      console.log("client: socket disconnected");
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      try {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.disconnect();
      } catch (e) {}
      setSocket(null);
    };
  }, [userData]);

  const getGeminiResponse = async (command) => {
    try {
      const res = await axios.post(`${serverUrl}/api/user/asktoassistant`, { command }, { withCredentials: true });
      return res.data;
    } catch (err) {
      console.error("getGeminiResponse error", err?.response?.data || err.message || err);
    }
  };

  // 🔹 Logout function
  const logout = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
    } catch (e) {
      console.warn("logout error", e);
    }
    // Clear token from localStorage
    localStorage.removeItem('token');
    setUserData(null);
    try { if (socket) socket.disconnect(); } catch(e) {}
  };

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    getGeminiResponse,
    socket,
    logout,
  };

  return <userDataContext.Provider value={value}>{children}</userDataContext.Provider>;
}

export default UserContext;
