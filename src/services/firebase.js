// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5V6bxalGckEYM5uNThpTN8Oh5ZdFZOgE",
  authDomain: "fast-food-6df61.firebaseapp.com",
  projectId: "fast-food-6df61",
  storageBucket: "fast-food-6df61.firebasestorage.app",
  messagingSenderId: "333469106749",
  appId: "1:333469106749:web:e8896c221e32eed793a054"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
