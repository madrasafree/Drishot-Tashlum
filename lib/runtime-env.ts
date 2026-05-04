import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getRuntimeEnv(name: string): string | undefined {
  const processValue = process.env[name];
  if (processValue) {
    return processValue;
  }

  try {
    const env = getCloudflareContext({ async: false }).env as Record<string, unknown>;
    const value = env[name];

    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
