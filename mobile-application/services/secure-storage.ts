/**
 * Secret storage (STACK_BASIS §8): expo-secure-store on native, AsyncStorage
 * fallback on web. Tokens NEVER go to AsyncStorage on native.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const STORAGE_KEYS = {
  accessToken: "auth.access-token",
  refreshToken: "auth.refresh-token",
  scope: "auth.scope",
} as const;

const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return await AsyncStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Storage failures must never crash the caller.
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    if (isWeb) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export function getAccessToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.refreshToken);
}

export async function storeTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    setItem(STORAGE_KEYS.accessToken, tokens.accessToken),
    setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken),
  ]);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    deleteItem(STORAGE_KEYS.accessToken),
    deleteItem(STORAGE_KEYS.refreshToken),
    deleteItem(STORAGE_KEYS.scope),
  ]);
}

/** Session scope ("guest" | "resident") persisted alongside the tokens. */
export function getStoredScope(): Promise<string | null> {
  return getItem(STORAGE_KEYS.scope);
}

export function storeScope(scope: string): Promise<void> {
  return setItem(STORAGE_KEYS.scope, scope);
}

/**
 * Cached-session startup: token PRESENCE only — never a network check.
 * Guests hold an access token but an empty refresh token, so presence of
 * EITHER token counts as a session.
 */
export async function hasSession(): Promise<boolean> {
  const [refresh, access] = await Promise.all([
    getRefreshToken(),
    getAccessToken(),
  ]);
  return Boolean(refresh?.length) || Boolean(access?.length);
}
