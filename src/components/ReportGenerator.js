// src/components/ReportGenerator.js
import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./ReportGenerator.css";

function ReportGenerator() {
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [surveyList, setSurveyList] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Load user's surveys
  useEffect(() => {
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

  // Load responses when survey selected
  useEffect(() => {
    if (!selectedSurvey) return;

    const loadResponses = async () => {
      setLoading(true);
      try {
        const responsesQuery = query(
          collection(db, "responses"),
          where("surveyId", "==", selectedSurvey)
        );
        const snapshot = await getDocs(responsesQuery);
        const responseList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResponses(responseList);

        // Calculate stats
        calculateStats(responseList);
      } catch (err) {
        console.error("Error loading responses:", err);
      }
      setLoading(false);
    };

    loadResponses();
  }, [selectedSurvey]);

  // After loading surveyList
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get("surveyId");
    if (surveyId && surveyList.find((s) => s.id === surveyId)) {
      setSelectedSurvey(surveyId);
    }
  }, [surveyList]);

  const calculateStats = (responseList) => {
    if (responseList.length === 0) {
      setStats(null);
      return;
    }

    const totalResponses = responseList.length;
    const sources = {
      digital: responseList.filter((r) => r.source === "digital").length,
      physical_upload: responseList.filter(
        (r) => r.source === "physical_upload"
      ).length,
    };

    // Get question count from first response
    const questionCount = responseList[0].answers
      ? Object.keys(responseList[0].answers).length
      : 0;

    setStats({
      totalResponses,
      sources,
      questionCount,
      completionRate: 100, // Since all are submitted
      dateRange: {
        start: new Date(
          Math.min(
            ...responseList.map((r) =>
              r.submittedAt.toDate
                ? r.submittedAt.toDate().getTime()
                : new Date(r.submittedAt).getTime()
            )
          )
        ),
        end: new Date(
          Math.max(
            ...responseList.map((r) =>
              r.submittedAt.toDate
                ? r.submittedAt.toDate().getTime()
                : new Date(r.submittedAt).getTime()
            )
          )
        ),
      },
    });
  };

  const generatePDF = () => {
    if (!selectedSurvey || responses.length === 0) return;

    const survey = surveyList.find((s) => s.id === selectedSurvey);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Survey Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Survey ID: ${selectedSurvey}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

    // Stats table
    if (stats) {
      doc.autoTable({
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Responses", stats.totalResponses],
          ["Digital Submissions", stats.sources.digital],
          ["Physical Submissions", stats.sources.physical_upload],
          ["Questions per Survey", stats.questionCount],
          [
            "Date Range",
            `${stats.dateRange.start.toLocaleDateString()} - ${stats.dateRange.end.toLocaleDateString()}`,
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [78, 205, 196] },
      });
    }

    // Responses
    let startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;
    doc.setFontSize(16);
    doc.text("Individual Responses", 14, startY);

    responses.forEach((response, index) => {
      startY += 10;
      if (startY > 280) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.text(`Response #${index + 1} (ID: ${response.id})`, 14, startY);
      doc.text(
        `Source: ${response.source} | Date: ${new Date(
          response.submittedAt.toDate
            ? response.submittedAt.toDate()
            : response.submittedAt
        ).toLocaleString()}`,
        14,
        startY + 6
      );

      Object.entries(response.answers).forEach(([qIndex, answer], aIndex) => {
        startY += 10;
        if (startY > 280) {
          doc.addPage();
          startY = 20;
        }
        doc.text(
          `Q${parseInt(qIndex) + 1}: ${answer.substring(0, 100)}${
            answer.length > 100 ? "..." : ""
          }`,
          20,
          startY
        );
      });

      startY += 10;
    });

    // Save PDF
    doc.save(`survey-report-${selectedSurvey}-${Date.now()}.pdf`);
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h1>📈 Generate Report</h1>
        <p>Analyze and export your survey results</p>
      </div>

      <div className="controls">
        <select
          value={selectedSurvey}
          onChange={(e) => setSelectedSurvey(e.target.value)}
          className="survey-select"
        >
          <option value="">-- Select a survey to generate report --</option>
          {surveyList.map((survey) => (
            <option key={survey.id} value={survey.id}>
              {survey.questions?.[0]?.substring(0, 50) || "Untitled"}... (
              {survey.id})
            </option>
          ))}
        </select>

        {selectedSurvey && (
          <button
            onClick={generatePDF}
            className="export-btn"
            disabled={loading || responses.length === 0}
          >
            📄 Export PDF Report
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading responses...</div>
      ) : selectedSurvey && responses.length === 0 ? (
        <div className="no-data">No responses found for this survey</div>
      ) : (
        stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalResponses}</div>
              <div className="stat-label">Total Responses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.sources.digital}</div>
              <div className="stat-label">Digital</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.sources.physical_upload}</div>
              <div className="stat-label">Physical</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.questionCount}</div>
              <div className="stat-label">Questions</div>
            </div>
          </div>
        )
      )}

      {selectedSurvey && responses.length > 0 && (
        <div className="responses-preview">
          <h3>Recent Responses ({responses.length} total)</h3>
          <div className="responses-list">
            {responses.slice(0, 5).map((response) => (
              <div key={response.id} className="response-preview">
                <div className="preview-header">
                  <span className="response-id">#{response.id}</span>
                  <span className="source-tag">{response.source}</span>
                </div>
                <div className="preview-answers">
                  {Object.entries(response.answers)
                    .slice(0, 2)
                    .map(([qIndex, answer]) => (
                      <div key={qIndex} className="preview-answer">
                        <strong>Q{parseInt(qIndex) + 1}:</strong>{" "}
                        {answer.substring(0, 50)}
                        {answer.length > 50 ? "..." : ""}
                      </div>
                    ))}
                  {Object.keys(response.answers).length > 2 && (
                    <div className="more-answers">
                      +{Object.keys(response.answers).length - 2} more answers
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportGenerator;
