// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./utils/firebase";
import LoginForm from "./components/LoginForm";
import SurveyUpload from "./components/SurveyUpload";
import SurveyForm from "./components/SurveyForm";
import Dashboard from "./components/Dashboard";
import PhyscalUpload from "./components/PhysicalUpload";
import ReportGenerator from "./components/ReportGenerator";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user && (
          <nav className="main-nav">
            <button onClick={() => (window.location.href = "/")}>
              📤 Upload
            </button>
            <button onClick={() => (window.location.href = "/dashboard")}>
              📊 Dashboard
            </button>
            <button onClick={() => auth.signOut()}>🚪 Logout</button>
          </nav>
        )}
        <Routes>
          <Route path="/fill/:surveyId" element={<SurveyForm />} />
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <LoginForm />}
          />
          <Route
            path="physical-upload"
            element={user ? <PhyscalUpload /> : <LoginForm />}
          />
          <Route
            path="reports"
            element={user ? <ReportGenerator /> : <LoginForm />}
          />
          <Route path="/" element={user ? <SurveyUpload /> : <LoginForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
