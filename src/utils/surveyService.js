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
  try {
    console.log("🚀 Starting to save response...");
    console.log("📋 Survey ID:", surveyId);
    console.log("📝 Answers:", answers);

    const responseId = `RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response = {
      id: responseId,
      surveyId: surveyId,
      answers: answers,
      submittedAt: new Date(),
      source: 'digital'
    };

    console.log("💾 Saving response to Firestore:", response);

    await addDoc(collection(db, 'responses'), response);

    console.log("🔗 Updating survey with response ID:", responseId);

    const surveyRef = doc(db, 'surveys', surveyId);
    await updateDoc(surveyRef, {
      responses: arrayUnion(responseId)
    });

    console.log('✅ Response saved with ID:', responseId);
    return responseId;
  } catch (err) {
    console.error('❌ Error saving response:', err);
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
      collection(db, 'responses'),
      where('surveyId', '==', surveyId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);
    
    console.log(`🗑️ Found ${responsesSnapshot.docs.length} responses to delete`);

    const deletePromises = responsesSnapshot.docs.map(doc => {
      console.log("🗑️ Deleting response:", doc.id);
      return deleteDoc(doc.ref);
    });
    
    await Promise.all(deletePromises);
    console.log("✅ All responses deleted");

    // Then delete the survey itself
    console.log("🗑️ Deleting survey document...");
    await deleteDoc(doc(db, 'surveys', surveyId));

    console.log('✅ Survey and all responses deleted');
  } catch (err) {
    console.error('❌ Error deleting survey:', err);
    throw err;
  }
};
