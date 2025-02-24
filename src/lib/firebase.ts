import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  }

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth
const auth = getAuth(app)
auth.useDeviceLanguage() // Moved this line outside the conditional

// Enable localhost for development
if (typeof window !== "undefined") {
  if (window.location.hostname === "localhost") {
    auth.settings.appVerificationDisabledForTesting = true
  }
}

// Log the configuration (remove in production)
console.log("Firebase config:", firebaseConfig)

export { auth, signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential }

