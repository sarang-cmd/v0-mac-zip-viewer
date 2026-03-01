/**
 * Firebase Authentication utilities.
 * Provides Google, GitHub, and email/password authentication.
 * All methods are no-ops when Firebase is not configured.
 */
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, isConfigured } from "./firebase";

export async function signInWithGoogle(): Promise<User | null> {
  if (!isConfigured() || !auth) {
    console.warn("[ZIP Explorer] Firebase not configured - sign in skipped");
    return null;
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithGitHub(): Promise<User | null> {
  if (!isConfigured() || !auth) {
    console.warn("[ZIP Explorer] Firebase not configured - sign in skipped");
    return null;
  }
  const provider = new GithubAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  if (!isConfigured() || !auth) return null;
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function createAccount(email: string, password: string): Promise<User | null> {
  if (!isConfigured() || !auth) return null;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (!isConfigured() || !auth) return;
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  if (!isConfigured() || !auth) return null;
  return auth.currentUser;
}
