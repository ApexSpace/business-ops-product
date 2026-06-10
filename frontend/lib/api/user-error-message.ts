import { getAccessBlockedMessage } from "@/components/business-access/business-access-messages";
import {
  classifyApiError,
  isAuthSessionError,
} from "./error-classifier";
import { ApiClientError } from "./errors";
import { FetchNetworkError, FetchTimeoutError } from "./fetch-with-timeout";

export type UserErrorMessage = {
  title: string;
  description?: string;
  requestId?: string;
};

const STATUS_MESSAGES: Record<number, string> = {
  502: "The application server returned an invalid response. Please try again shortly.",
  503: "The service is temporarily unavailable. Check your connection or try again in a few minutes.",
  504: "The server took too long to respond. This often means the database or backend is overloaded.",
};

const CODE_MESSAGES: Record<string, string> = {
  BACKEND_UNAVAILABLE:
    "We can't reach the API server. Make sure the backend is running and try again.",
  SERVICE_TIMEOUT:
    "The server took too long to respond. Please wait a moment and try again.",
  SERVICE_UNAVAILABLE:
    "The database or backend is temporarily unavailable. Please try again shortly.",
  INTERNAL_ERROR:
    "Something went wrong on our side. If this keeps happening, contact support with the reference below.",
  FEATURE_NOT_AVAILABLE:
    "This feature is not included in your current package.",
};

export function getUserErrorMessage(error: unknown): UserErrorMessage {
  if (error instanceof ApiClientError) {
    const category = classifyApiError(error);

    if (category === "business_access" && error.code) {
      const blocked = getAccessBlockedMessage(error.code);
      return {
        title: blocked.title,
        description: blocked.message,
        requestId: error.requestId,
      };
    }

    if (category === "capability") {
      return {
        title: "Feature not included",
        description:
          CODE_MESSAGES.FEATURE_NOT_AVAILABLE ?? error.message,
        requestId: error.requestId,
      };
    }

    const byCode = error.code ? CODE_MESSAGES[error.code] : undefined;
    const byStatus = STATUS_MESSAGES[error.status];
    const description =
      byCode ??
      byStatus ??
      (error.status >= 500
        ? CODE_MESSAGES.INTERNAL_ERROR
        : error.message || "Request failed");

    return {
      title:
        error.status >= 500
          ? "Service problem"
          : isAuthSessionError(error)
            ? "Session expired"
            : category === "role"
              ? "Not authorized"
              : "Request failed",
      description,
      requestId: error.requestId,
    };
  }

  if (error instanceof FetchTimeoutError) {
    return {
      title: "Request timed out",
      description: CODE_MESSAGES.SERVICE_TIMEOUT,
    };
  }

  if (error instanceof FetchNetworkError) {
    return {
      title: "Connection failed",
      description:
        "Could not reach the application server. Check your network and that the backend is running.",
    };
  }

  if (error instanceof Error && error.message === "Load failed") {
    return {
      title: "Connection failed",
      description: CODE_MESSAGES.BACKEND_UNAVAILABLE,
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return { title: "Something went wrong", description: error.message };
  }

  return {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  };
}
