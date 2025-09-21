// src/utils/surveyService.js
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  doc,
  deleteDoc,
  where,
  query,
  getDocs,
} from "firebase/firestore";

export const createSurvey = async (questions, userId, expiryDate) => {
  const surveyData = {
    questions,
    createdBy: userId,
    createdAt: new Date(),
    expiresAt: expiryDate ? new Date(expiryDate) : null, // we’ll add expiry in Week 3
    responses: [],
  };

  const docRef = await addDoc(collection(db, "surveys"), surveyData);
  return docRef.id; // This is your unique survey ID!
};

export const submitResponse = async (surveyId, answers) => {
  console.log(
    "%c🚀 SUBMIT RESPONSE CALLED",
    "color: #ff6b6b; font-weight: bold; font-size: 16px"
  );
  console.log("📋 Survey ID received:", surveyId);
  console.log("📝 Answers received:", answers);

  if (!surveyId) {
    console.error("❌ SURVEY ID IS MISSING!");
    throw new Error("Survey ID is required");
  }

  if (!answers || Object.keys(answers).length === 0) {
    console.error("❌ NO ANSWERS PROVIDED!");
    throw new Error("No answers to save");
  }

  try {
    console.log(
      "%c📡 ATTEMPTING TO CONNECT TO FIRESTORE...",
      "color: #4ecdc4; font-weight: bold"
    );

    const responseId = `RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log("🔖 Generated Response ID:", responseId);

    const response = {
      id: responseId,
      surveyId: surveyId,
      answers: answers,
      submittedAt: new Date(),
      source: "digital",
    };

    console.log(
      "%c💾 PREPARING TO SAVE RESPONSE:",
      "color: #4ecdc4; font-weight: bold",
      response
    );

    // 👇 THIS IS THE CRITICAL LINE
    console.log(
      "%c_firestore.collection('responses').addDoc() CALLED_",
      "color: #ffd93d; font-weight: bold"
    );
    const docRef = await addDoc(collection(db, "responses"), response);
    console.log(
      "%c✅ RESPONSE SAVED TO FIRESTORE! Document ID:",
      "color: #2ecc71; font-weight: bold",
      docRef.id
    );

    // Update survey
    console.log(
      "%c🔗 UPDATING SURVEY WITH RESPONSE ID...",
      "color: #9b59b6; font-weight: bold"
    );
    const surveyRef = doc(db, "surveys", surveyId);
    await updateDoc(surveyRef, {
      responses: arrayUnion(responseId),
    });
    console.log(
      "%c✅ SURVEY UPDATED SUCCESSFULLY",
      "color: #2ecc71; font-weight: bold"
    );

    console.log(
      "%c🎉 FULL SUBMISSION SUCCESS! Response ID:",
      "color: #27ae60; font-weight: bold; font-size: 18px",
      responseId
    );
    return responseId;
  } catch (err) {
    console.error(
      "%c❌🔥 CRITICAL ERROR IN submitResponse:",
      "color: #e74c3c; font-weight: bold; font-size: 18px",
      err
    );
    console.error("❌ Error name:", err.name);
    console.error("❌ Error message:", err.message);
    console.error("❌ Error stack:", err.stack);
    throw err;
  }
};

export const isSurveyExpired = (expiresAt) => {
  if (!expiresAt) return false; // No expiry set
  const now = new Date();
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return now > expiry;
};

// Add this at the bottom
export const deleteSurvey = async (surveyId) => {
  try {
    console.log("🗑️ Starting to delete survey:", surveyId);

    // First, delete all responses for this survey
    const responsesQuery = query(
      collection(db, "responses"),
      where("surveyId", "==", surveyId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);

    console.log(
      `🗑️ Found ${responsesSnapshot.docs.length} responses to delete`
    );

    const deletePromises = responsesSnapshot.docs.map((doc) => {
      console.log("🗑️ Deleting response:", doc.id);
      return deleteDoc(doc.ref);
    });

    await Promise.all(deletePromises);
    console.log("✅ All responses deleted");

    // Then delete the survey itself
    console.log("🗑️ Deleting survey document...");
    await deleteDoc(doc(db, "surveys", surveyId));

    console.log("✅ Survey and all responses deleted");
  } catch (err) {
    console.error("❌ Error deleting survey:", err);
    throw err;
  }
};
