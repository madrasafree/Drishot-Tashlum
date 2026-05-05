import { getCloudflareContext } from "@opennextjs/cloudflare";

const ENV_ALIASES: Record<string, string[]> = {
  MONDAY_API_TOKEN: ["MONDAY_API_TOKEN", "Monday_API_TOKEN"],
  MONDAY_API_URL: ["MONDAY_API_URL", "Monday_API_URL"],
};

export function getRuntimeEnv(name: string): string | undefined {
  const candidateNames = ENV_ALIASES[name] ?? [name];

  for (const candidateName of candidateNames) {
    const processValue = process.env[candidateName];
    if (processValue) {
      return processValue;
    }
  }

  try {
    const env = getCloudflareContext({ async: false }).env as Record<string, unknown>;

    for (const candidateName of candidateNames) {
      const value = env[candidateName];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
