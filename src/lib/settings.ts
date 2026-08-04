import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

/**
 * Effective Gemini API key: a key saved via the Settings page takes
 * precedence over GEMINI_API_KEY in .env, which stays as a fallback
 * for anyone who prefers to configure it that way.
 */
export async function getGeminiApiKey(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  return settings?.geminiApiKey || process.env.GEMINI_API_KEY || null;
}

export async function getGeminiKeySource(): Promise<{
  key: string | null;
  source: "settings" | "env" | "none";
}> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (settings?.geminiApiKey) {
    return { key: settings.geminiApiKey, source: "settings" };
  }
  if (process.env.GEMINI_API_KEY) {
    return { key: process.env.GEMINI_API_KEY, source: "env" };
  }
  return { key: null, source: "none" };
}

export function maskApiKey(key: string): string {
  const visible = key.slice(-4);
  return `••••••••${visible}`;
}

export { SETTINGS_ID };
