/**
 * Firestore sync for user preferences (favorites, recents, settings).
 * All operations gracefully no-op if Firebase is not configured.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, isConfigured } from "./firebase";
import type { FavoriteItem } from "./types";

interface UserPreferences {
  favorites: FavoriteItem[];
  recentPaths: string[];
  theme: "light" | "dark" | "system";
  sidebarWidth: number;
  previewWidth: number;
  parseMode: "client" | "server";
  updatedAt?: unknown;
}

const DEFAULT_PREFS: UserPreferences = {
  favorites: [],
  recentPaths: [],
  theme: "system",
  sidebarWidth: 208,
  previewWidth: 350,
  parseMode: "client",
};

function getUserDocRef(userId: string) {
  if (!db) throw new Error("Firestore not initialized");
  return doc(db, "users", userId, "preferences", "main");
}

export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  if (!isConfigured() || !db) return DEFAULT_PREFS;
  try {
    const docRef = getUserDocRef(userId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { ...DEFAULT_PREFS, ...snapshot.data() } as UserPreferences;
    }
    // Create default doc
    await setDoc(docRef, { ...DEFAULT_PREFS, updatedAt: serverTimestamp() });
    return DEFAULT_PREFS;
  } catch (err) {
    console.warn("[ZIP Explorer] Failed to load preferences:", err);
    return DEFAULT_PREFS;
  }
}

export async function saveUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  if (!isConfigured() || !db) return;
  try {
    const docRef = getUserDocRef(userId);
    await updateDoc(docRef, { ...prefs, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn("[ZIP Explorer] Failed to save preferences:", err);
  }
}

export async function saveFavoritesToCloud(
  userId: string,
  favorites: FavoriteItem[]
): Promise<void> {
  return saveUserPreferences(userId, { favorites });
}

export async function saveRecentPathsToCloud(
  userId: string,
  recentPaths: string[]
): Promise<void> {
  return saveUserPreferences(userId, { recentPaths });
}
