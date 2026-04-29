export type UserKeyName = "openai" | "deepseek" | "gemini";

const STORAGE_PREFIX = "studio_user_key_";

export function getUserKey(name: UserKeyName): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_PREFIX + name) || "";
  } catch {
    return "";
  }
}

export function setUserKey(name: UserKeyName, value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(STORAGE_PREFIX + name, value.trim());
    } else {
      localStorage.removeItem(STORAGE_PREFIX + name);
    }
    window.dispatchEvent(
      new CustomEvent("studio:user-keys-changed", { detail: { name } }),
    );
  } catch {
    /* ignore */
  }
}

export function clearUserKey(name: UserKeyName): void {
  setUserKey(name, "");
}

export function getAllUserKeys(): Record<UserKeyName, string> {
  return {
    openai: getUserKey("openai"),
    deepseek: getUserKey("deepseek"),
    gemini: getUserKey("gemini"),
  };
}

/**
 * Resolve an API key by checking the user's saved key first,
 * then falling back to the build-time environment variable.
 */
export function resolveOpenAIKey(): string {
  const user = getUserKey("openai");
  if (user) return user;
  return (import.meta.env.VITE_OPENAI_API_KEY as string) || "";
}

export function resolveDeepSeekKey(): string {
  const user = getUserKey("deepseek");
  if (user) return user;
  return (import.meta.env.VITE_DEEPSEEK_API_KEY as string) || "";
}

export function resolveGeminiKey(): string {
  const user = getUserKey("gemini");
  if (user) return user;
  return (
    (process as unknown as { env: Record<string, string> }).env
      ?.GEMINI_API_KEY ||
    (process as unknown as { env: Record<string, string> }).env?.API_KEY ||
    ""
  );
}
