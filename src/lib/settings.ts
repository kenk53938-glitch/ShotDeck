import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "singleton";

export interface AiProviderConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
}

export async function getAiProviderSettingsRow() {
  return prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
}

/**
 * Effective AI provider config for shot-list parsing, or null if not
 * fully configured (all three of base URL, key, and model are
 * required). Configured entirely through the Settings page.
 */
export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  const row = await getAiProviderSettingsRow();
  if (row?.apiBaseUrl && row?.apiKey && row?.modelName) {
    return {
      apiBaseUrl: row.apiBaseUrl,
      apiKey: row.apiKey,
      modelName: row.modelName,
    };
  }
  return null;
}

export function maskApiKey(key: string): string {
  const visible = key.slice(-4);
  return `••••••••${visible}`;
}
