import { prisma } from "@/lib/prisma";

export interface AiProviderConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
}

export async function listAiProviderProfiles() {
  return prisma.aiProviderProfile.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getActiveAiProviderProfile() {
  return prisma.aiProviderProfile.findFirst({ where: { isActive: true } });
}

/**
 * Effective AI provider config for shot-list parsing and prompt
 * generation, or null if no profile is configured/active. Configured
 * entirely through the Settings page, which supports saving multiple
 * named provider profiles and switching which one is active.
 */
export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  const row = await getActiveAiProviderProfile();
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
