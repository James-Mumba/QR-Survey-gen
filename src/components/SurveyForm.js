// src/components/SurveyForm.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./SurveyForm.css";
import { submitResponse } from "../utils/surveyService";

function SurveyForm() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(true);
  const [error, setError] = useState("");
  const [responseId, setResponseId] = useState("");

  useEffect(() => {
    const fetchSurvey = async () => {
      console.log("🔍 Fetching survey with ID:", surveyId); // 👈 ADD THIS

      try {
        const docRef = doc(db, "surveys", surveyId);
        const docSnap = await getDoc(docRef);

        console.log("📄 Doc exists?", docSnap.exists()); // 👈 ADD THIS

        if (docSnap.exists()) {
          setSurvey(docSnap.data());
        } else {
          setError("Survey not found");
          console.log("❌ Survey does not exist in Firestore"); // 👈 ADD THIS
        }
      } catch (err) {
        setError("Error loading survey");
        console.error("💥 Error fetching survey:", err); // 👈 ADD THIS
      }
      setLoading(false);
    };

    fetchSurvey();
  }, [surveyId]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const responseId = await submitResponse(surveyId, answers);
      setResponseId(responseId);
      setSubmitted(true);
      alert(`Thank you! Response saved with ID: ${responseId}`);
    } catch (err) {
      setError("Failed to submit response: " + err.message);
    }

    setLoading(false);
  };

  if (loading) return <div className="loading">Loading survey...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!survey) return <div className="error">Survey not found</div>;

  return (
    <div className="survey-form-container">
      <div className="form-header">
        <h1>📝 Survey Form</h1>
        <p className="survey-id">ID: {surveyId}</p>
      </div>

      <form onSubmit={handleSubmit} className="survey-form">
        {survey.questions.map((question, index) => (
          <div key={index} className="form-group">
            <label className="question-label">
              <span className="q-number">Q{index + 1}</span>
              {question}
            </label>
            <textarea
              value={answers[index] || ""}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              placeholder="Type your answer here..."
              className="answer-input"
              required
            />
          </div>
        ))}
        {!submitted ? (
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "⏳ Submitting..." : "✅ Submit Survey"}
          </button>
        ) : (
          <div className="thank-you">
            <div className="confetti">🎉</div>
            <h2>Thank You!</h2>
            <p>Your response has been recorded.</p>
            <p className="response-id">
              Response ID: <strong>{responseId}</strong>
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(responseId)}
              className="copy-btn"
            >
              📋 Copy ID
            </button>
            <p className="info">
              The survey creator can now view your response in their dashboard.
            </p>
            <button onClick={() => window.close()} className="close-btn">
              Close Window
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default SurveyForm;
