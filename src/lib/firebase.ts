
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// Temporary Firebase configuration for testing
const firebaseConfig = {
  apiKey: "AIzaSyDkpEDPF8tFvsOAJk8Qgqgyo8V6AI7KjAY",
  authDomain: "doodlecaboodle-7ae52.firebaseapp.com",
  projectId: "doodlecaboodle-7ae52",
  storageBucket: "doodlecaboodle-7ae52.firebasestorage.app",
  messagingSenderId: "406666826825",
  appId: "1:406666826825:web:dee06f4e494ae67f1cdb98",
  measurementId: "G-6SECFDMSPG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Create a demo admin user if it doesn't exist
const createDemoAdminUser = async () => {
  try {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      await createUserWithEmailAndPassword(auth, "admin@example.com", "admin123");
      console.log("Demo admin user created successfully");
    }
  } catch (error: any) {
    // Error code auth/email-already-in-use means user already exists, which is fine
    if (error.code !== 'auth/email-already-in-use') {
      console.error("Error creating demo admin user:", error);
    }
  }
};

// Attempt to create demo user
createDemoAdminUser();

export { app, db, storage, auth };
