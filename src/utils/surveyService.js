// src/utils/surveyService.js
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  doc,
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
  try {
    // Generate unique response ID (you can customize format)
    const responseId = `RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response = {
      id: responseId,
      surveyId: surveyId,
      answers: answers,
      submittedAt: new Date(),
      source: "digital",
    };

    // Save to 'responses' collection
    const responseRef = await addDoc(collection(db, "responses"), response);
    console.log("Response document created with ID:", responseRef.id);

    // Also add response ID to survey's responses array (for easy lookup)
    const surveyRef = doc(db, "surveys", surveyId);
    await updateDoc(surveyRef, {
      responses: arrayUnion(responseId),
    });

    console.log("✅ Response saved with ID:", responseId);
    return responseId;
  } catch (err) {
    console.error("❌ Error saving response:", err);
    throw err;
  }
};

export const isSurveyExpired = (expiresAt) => {
  if (!expiresAt) return false; // No expiry set
  const now = new Date();
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return now > expiry;
};
