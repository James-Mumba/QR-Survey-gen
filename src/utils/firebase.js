
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA90KUahyTbqTnaodeA8aDQpHXxWyqWpuU",
  authDomain: "docusurvey-765ca.firebaseapp.com",
  projectId: "docusurvey-765ca",
  storageBucket: "docusurvey-765ca.firebasestorage.app",
  messagingSenderId: "373710142815",
  appId: "1:373710142815:web:61df05e95554b7e88acaea",
  measurementId: "G-NLY7FDWY46"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const db = getFirestore(app);
export const storage = getStorage(app);


