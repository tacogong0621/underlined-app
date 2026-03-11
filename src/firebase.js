import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUOOSwFaO9hIo6QBYMnbboPO7XNYfCkZw",
  authDomain: "underlined-7c199.firebaseapp.com",
  projectId: "underlined-7c199",
  storageBucket: "underlined-7c199.firebasestorage.app",
  messagingSenderId: "531063887909",
  appId: "1:531063887909:web:475e88a20f648c010b47cc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
