import { cache } from "react";

interface MondayGraphQLError {
  message: string;
  extensions?: {
    code?: string;
    status_code?: number;
    error_code?: string;
  };
}

interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
}

export class MondayApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(message: string, statusCode = 500, errorCode = "MONDAY_API_ERROR") {
    super(message);
    this.name = "MondayApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

function getMondayConfig() {
  const token = process.env.MONDAY_API_TOKEN;
  const apiUrl = process.env.MONDAY_API_URL || "https://api.monday.com/v2";

  if (!token) {
    throw new MondayApiError(
      "MONDAY_API_TOKEN is missing. Add it to your environment variables before running the app.",
      500,
      "MISSING_TOKEN",
    );
  }

  return { token, apiUrl };
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
    .join(",")}}`;
}

async function performQuery<T>(query: string, variablesJson: string): Promise<T> {
  const { token, apiUrl } = getMondayConfig();
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          query,
          variables: JSON.parse(variablesJson),
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      const payload = (await response.json()) as MondayGraphQLResponse<T>;

      if (!response.ok || payload.errors?.length) {
        const firstError = payload.errors?.[0];
        const message = firstError?.message || `Monday API request failed with status ${response.status}.`;
        const errorCode = firstError?.extensions?.code || firstError?.extensions?.error_code || "MONDAY_API_ERROR";
        const statusCode = firstError?.extensions?.status_code || response.status || 500;
        const isRateLimited =
          response.status === 429 ||
          errorCode.toLowerCase().includes("rate") ||
          message.toLowerCase().includes("rate");

        if (isRateLimited && attempt < maxAttempts) {
          await sleep(attempt * 750);
          continue;
        }

        throw new MondayApiError(`${message} [${errorCode}]`, statusCode, errorCode);
      }

      if (!payload.data) {
        throw new MondayApiError("Monday API returned an empty response.", response.status || 500, "EMPTY_DATA");
      }

      return payload.data;
    } catch (error) {
      if (error instanceof MondayApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new MondayApiError(
          "Monday API request timed out after 30 seconds.",
          504,
          "MONDAY_TIMEOUT",
        );
      }

      if (attempt < maxAttempts) {
        await sleep(attempt * 500);
        continue;
      }

      throw new MondayApiError(
        error instanceof Error ? error.message : "Unexpected Monday API error.",
        500,
        "UNKNOWN_ERROR",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new MondayApiError("Monday API request exhausted all retry attempts.", 429, "RETRY_EXHAUSTED");
}

const cachedQuery = cache(async <T>(query: string, variablesJson: string) => performQuery<T>(query, variablesJson));

export async function fetchQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  return cachedQuery<T>(query, stableSerialize(variables));
}
