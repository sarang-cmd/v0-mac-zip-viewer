/**
 * useAuth hook - Firebase authentication state management.
 * Returns null user when Firebase is not configured.
 */
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isConfigured } from "./firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isConfigured();

  useEffect(() => {
    if (!configured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [configured]);

  return { user, loading, isConfigured: configured };
}
