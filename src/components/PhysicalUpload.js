// src/components/PhysicalUpload.js
import React, { useState } from "react";
import { db, storage } from "../utils/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import "./PhysicalUpload.css";

function PhysicalUpload() {
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [surveyList, setSurveyList] = useState([]);
  const [file, setFile] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  // Load user's surveys on mount
  React.useEffect(() => {
    if (!user) return;

    const loadSurveys = async () => {
      try {
        const surveysQuery = window.firebase
          .firestore()
          .collection("surveys")
          .where("createdBy", "==", user.uid);
        const snapshot = await surveysQuery.get();
        const surveys = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSurveyList(surveys);
      } catch (err) {
        console.error("Error loading surveys:", err);
      }
    };

    loadSurveys();
  }, [user]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSurvey) {
      setError("Please select a survey");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Generate unique response ID
      const responseId = `PHYS-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

      // Upload scan image if exists
      let scanUrl = null;
      if (file) {
        const storageRef = ref(storage, `scans/${responseId}/${file.name}`);
        await uploadBytes(storageRef, file);
        scanUrl = await getDownloadURL(storageRef);
      }

      // Create response object
      const response = {
        id: responseId,
        surveyId: selectedSurvey,
        answers: answers,
        submittedAt: new Date(),
        source: "physical_upload",
        physicalScanUrl: scanUrl,
      };

      // Save to Firestore
      const responseRef = await addDoc(collection(db, "responses"), response);

      // Add to survey's responses array
      const surveyRef = doc(db, "surveys", selectedSurvey);
      await updateDoc(surveyRef, {
        responses: arrayUnion(responseId),
      });

      setMessage(`✅ Physical response saved! ID: ${responseId}`);
      setFile(null);
      setAnswers({});
    } catch (err) {
      setError("Failed to save physical response: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="physical-upload-container">
      <div className="upload-header">
        <h1>📸 Upload Physical Survey</h1>
        <p>Upload a scan/photo and enter responses manually</p>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label>Select Survey:</label>
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            className="survey-select"
            required
          >
            <option value="">-- Choose a survey --</option>
            {surveyList.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.questions?.[0]?.substring(0, 50) || "Untitled"}... (
                {survey.id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Upload Scan (optional):</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="file-input"
          />
          {file && <p className="file-name">📄 {file.name}</p>}
        </div>

        {selectedSurvey &&
          surveyList.find((s) => s.id === selectedSurvey)?.questions && (
            <div className="questions-section">
              <h3>Enter Responses:</h3>
              {surveyList
                .find((s) => s.id === selectedSurvey)
                .questions.map((question, index) => (
                  <div key={index} className="question-group">
                    <label className="question-label">
                      <span className="q-number">Q{index + 1}</span>
                      {question}
                    </label>
                    <textarea
                      value={answers[index] || ""}
                      onChange={(e) =>
                        handleAnswerChange(index, e.target.value)
                      }
                      placeholder="Enter response..."
                      className="answer-input"
                      required
                    />
                  </div>
                ))}
            </div>
          )}

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <button
          type="submit"
          disabled={!selectedSurvey || loading}
          className="submit-btn"
        >
          {loading ? "⏳ Saving..." : "💾 Save Physical Response"}
        </button>
      </form>
    </div>
  );
}

export default PhysicalUpload;
