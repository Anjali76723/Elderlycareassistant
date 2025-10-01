import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import CaregiverReminders from "./pages/CaregiverReminders";
import CaregiverAlerts from "./pages/CaregiverAlerts";
import ElderlyHome from "./pages/ElderlyHome";
import ElderlyAssistant from "./pages/ElderlyAssistant";
import { userDataContext } from "./context/UserContext";

function App() {
  const { userData } = useContext(userDataContext);

  return (
    <Routes>
      <Route
        path="/"
        element={
          userData
            ? userData.role === "elderly"
              ? <ElderlyHome />
              : <Navigate to="/caregiver/reminders" />
            : <Navigate to="/signin" />
        }
      />

      <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
      <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />

      {/* Elderly-only assistant */}
      <Route
        path="/assistant"
        element={userData && userData.role === "elderly" ? <ElderlyAssistant /> : <Navigate to="/signin" />}
      />

      {/* Caregiver pages */}
      <Route
        path="/caregiver/reminders"
        element={userData && userData.role === "caregiver" ? <CaregiverReminders /> : <Navigate to="/signin" />}
      />

      <Route
        path="/alerts"
        element={userData && userData.role === "caregiver" ? <CaregiverAlerts /> : <Navigate to="/signin" />}
      />
    </Routes>
  );
}

export default App;
