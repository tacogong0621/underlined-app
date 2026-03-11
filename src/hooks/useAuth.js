import { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = () => signInWithPopup(auth, provider);
  const signOut = () => firebaseSignOut(auth);

  return { user, loading, signIn, signOut };
}
