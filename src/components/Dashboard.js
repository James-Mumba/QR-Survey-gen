// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "./Dashboard.css";
import { deleteSurvey } from "../utils/surveyService";

function Dashboard() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'today', 'yesterday', 'thisWeek', 'all'
  const [error, setError] = useState("");
  const [surveys, setSurveys] = useState([]); // 👈 ADD THIS

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchResponses = async () => {
      setLoading(true);
      setError("");

      try {
        // First, get all surveys created by this user
        const surveysQuery = query(
          collection(db, "surveys"),
          where("createdBy", "==", user.uid)
        );
        const surveysSnapshot = await getDocs(surveysQuery);
        const surveyIds = surveysSnapshot.docs.map((doc) => doc.id);

        if (surveyIds.length === 0) {
          setResponses([]);
          setLoading(false);
          return;
        }

        // Then get all responses for those surveys
        // Build base query
        let responsesQuery = query(
          collection(db, "responses"),
          where("surveyId", "in", surveyIds)
        );

        // Add date filters
        const now = new Date();
        let startDate = null;

        if (filter === "today") {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
        } else if (filter === "yesterday") {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          const endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
        } else if (filter === "thisWeek") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
          startDate = new Date(now.setDate(diff));
        }

        // 👇 ORDER BY — ONLY ONCE!
        responsesQuery = query(responsesQuery, orderBy("submittedAt", "desc"));

        const responsesSnapshot = await getDocs(responsesQuery);

        let filteredResponses = responsesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Client-side date filtering for yesterday
        if (filter === "yesterday") {
          const yesterday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          filteredResponses = filteredResponses.filter((r) => {
            const submitted = r.submittedAt.toDate
              ? r.submittedAt.toDate()
              : new Date(r.submittedAt);
            return submitted >= yesterday && submitted < today;
          });
        }

        // Filter by startDate for today/thisWeek
        if (startDate && filter !== "yesterday") {
          filteredResponses = filteredResponses.filter((r) => {
            const submitted = r.submittedAt.toDate
              ? r.submittedAt.toDate()
              : new Date(r.submittedAt);
            return submitted >= startDate;
          });
        }

        setResponses(filteredResponses);
      } catch (err) {
        setError("Failed to load responses: " + err.message);
      }

      setLoading(false);
    };

    fetchResponses();
  }, [user, filter]);

  // Load surveys created by user
  useEffect(() => {
    if (!user) return;

    const loadSurveys = async () => {
      try {
        const surveysQuery = query(
          collection(db, "surveys"),
          where("createdBy", "==", user.uid)
        );
        const snapshot = await getDocs(surveysQuery);
        const surveyList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSurveys(surveyList);
      } catch (err) {
        console.error("Error loading surveys:", err);
      }
    };

    loadSurveys();
  }, [user]);

  const formatDate = (timestamp) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Survey Dashboard</h1>
        <p>View and analyze all responses</p>
      </div>
      {/* Add this section */}
      <div className="surveys-section">
        <h2>📋 My Uploaded Surveys</h2>
        {surveys.length === 0 ? (
          <p>No surveys uploaded yet.</p>
        ) : (
          <div className="surveys-grid">
            {surveys.map((survey) => (
              <div key={survey.id} className="survey-card">
                <h3>
                  {survey.questions?.[0]?.substring(0, 50) || "Untitled Survey"}
                  ...
                </h3>
                <p>
                  <strong>ID:</strong> {survey.id}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {survey.createdAt?.toDate?.()?.toLocaleString() || "Unknown"}
                </p>
                <p>
                  <strong>Responses:</strong> {survey.responses?.length || 0}
                </p>

                {/* Add next to delete button: */}
                <button
                  onClick={() =>
                    (window.location.href = `/reports?surveyId=${survey.id}`)
                  }
                  className="report-btn"
                >
                  📊 Generate Report
                </button>
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Delete this survey and ALL its responses? This cannot be undone."
                      )
                    ) {
                      try {
                        await deleteSurvey(survey.id);
                        // Refresh surveys
                        const surveysQuery = query(
                          collection(db, "surveys"),
                          where("createdBy", "==", user.uid)
                        );
                        const snapshot = await getDocs(surveysQuery);
                        setSurveys(
                          snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                          }))
                        );

                        // Refresh responses
                        // ... your existing response loading logic
                      } catch (err) {
                        alert("Failed to delete: " + err.message);
                      }
                    }
                  }}
                  className="delete-btn"
                >
                  🗑️ Delete Survey
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="filter-bar">
        <button
          className={filter === "all" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilter("all")}
        >
          All Time
        </button>
        <button
          className={filter === "today" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilter("today")}
        >
          Today
        </button>
        <button
          className={
            filter === "yesterday" ? "filter-btn active" : "filter-btn"
          }
          onClick={() => setFilter("yesterday")}
        >
          Yesterday
        </button>
        <button
          className={filter === "thisWeek" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilter("thisWeek")}
        >
          This Week
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading responses...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : responses.length === 0 ? (
        <div className="no-data">No responses found</div>
      ) : (
        <div className="responses-grid">
          {responses.map((response) => (
            <div key={response.id} className="response-card">
              <div className="card-header">
                <span className="response-id">#{response.id}</span>
                <span className="submit-time">
                  {formatDate(response.submittedAt)}
                </span>
              </div>
              <div className="answers-list">
                {Object.entries(response.answers).map(([qIndex, answer]) => (
                  <div key={qIndex} className="answer-item">
                    <span className="q-label">Q{parseInt(qIndex) + 1}:</span>
                    <p className="answer-text">{answer}</p>
                  </div>
                ))}
              </div>
              <div className="card-footer">
                <span className="source-badge">{response.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const isSurveyExpired = (expiresAt) => {
  if (!expiresAt) return false; // No expiry set
  const now = new Date();
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return now > expiry;
};
export default Dashboard;
