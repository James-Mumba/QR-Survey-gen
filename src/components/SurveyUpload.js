// src/components/SurveyUpload.js

import React, { useState, useEffect } from "react";
import mammoth from "mammoth";
import { getAuth } from "firebase/auth";
import { createSurvey } from "../utils/surveyService";
import "./SurveyUpload.css";
import { QRCodeCanvas } from "qrcode.react";

function SurveyUpload() {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [surveyId, setSurveyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSurveyId(null); // Reset if new file
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!user) {
      setError("You must be logged in");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      // Save to Firestore
      const id = await createSurvey(lines, user.uid);
      setQuestions(lines);
      setSurveyId(id);
    } catch (err) {
      setError("Failed to process survey: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>📄 Upload Your Survey (.docx)</h2>
        <p className="subtitle">
          Turn Word documents into scannable digital forms
        </p>
      </div>

      <div className="upload-area">
        <input
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          id="file-upload"
          className="file-input"
        />
        <label htmlFor="file-upload" className="file-label">
          📂 {file ? file.name : "Choose a .docx file"}
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="upload-btn"
        >
          {loading ? "🚀 Processing..." : "✨ Generate QR Survey"}
        </button>
        <div className="expiry-section">
          <label>Set Expiry Date/Time (optional):</label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="expiry-input"
          />
        </div>

        {error && <p className="error-message">{error}</p>}
      </div>

      {surveyId && (
        <div className="success-section">
          <div className="celebration">🎉 Survey Created!</div>
          <p className="survey-id">
            Survey ID: <strong>{surveyId}</strong>
          </p>
          <p className="share-text">Scan the QR code below or visit:</p>
          <p className="share-url">yourapp.com/fill/{surveyId}</p>
          {/* QR code goes here */}
          <QRCodeCanvas
            value={`${window.location.origin}/fill/${surveyId}`}
            size={200}
            level="H"
            includeMargin={true}
          />
          <p className="scan-instruction">📱 Scan with your phone camera</p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="preview-section">
          <h3>🔍 Preview Questions</h3>
          <div className="questions-list">
            {questions.map((q, index) => (
              <div key={index} className="question-card">
                <span className="q-badge">Q{index + 1}</span>
                <p className="q-text">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyUpload;
