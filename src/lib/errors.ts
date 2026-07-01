import { ConvexError } from "convex/values";

function readConvexErrorData(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return null;
}

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const message = readConvexErrorData(error.data);
    if (message) return message;
  }

  if (error instanceof Error) {
    const withData = error as Error & { data?: unknown };
    const dataMessage = readConvexErrorData(withData.data);
    if (dataMessage) return dataMessage;

    if (error.message && error.message !== "Server Error") {
      return error.message;
    }
  }

  if (error && typeof error === "object" && "data" in error) {
    const message = readConvexErrorData((error as { data: unknown }).data);
    if (message) return message;
  }

  return fallback;
}

export function isExpectedAuthError(error: unknown): boolean {
  const message = getFriendlyErrorMessage(error, "");
  return (
    message.includes("Invalid email or password") ||
    message.includes("Current password is incorrect") ||
    message.includes("Unauthorized")
  );
}
