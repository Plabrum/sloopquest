import { AxiosError } from "axios";
import { toast } from "sonner";

interface ApiErrorResponse {
  detail?: string;
  status_code?: number;
  extra?:
    | Array<{
        message?: string;
        key?: string;
        source?: string;
      }>
    | Record<string, unknown>;
}

interface HandleErrorOptions {
  fallbackMessage?: string;
  showToast?: boolean;
  toastFn?: (message: string) => void;
  logError?: boolean;
}

export function getErrorMessage(
  error: unknown,
  fallbackMessage = "An error occurred",
): string {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    const responseData = axiosError.response?.data;
    const status = axiosError.response?.status;

    // 5xx error bodies may include sensitive data formatted into the
    // message by the backend. Never render their text in the UI.
    if (status && status >= 500) {
      return "Server error. Please try again later.";
    }

    if (responseData?.extra && Array.isArray(responseData.extra)) {
      const messages = responseData.extra
        .map((item) => item.message)
        .filter((msg): msg is string => typeof msg === "string");

      if (messages.length > 0) {
        return messages.length === 1 ? messages[0] : messages.join("; ");
      }
    }

    if (responseData?.detail) {
      return responseData.detail;
    }

    if (status) {
      if (status === 401) {
        return "Authentication required. Please sign in again.";
      }
      if (status === 403) {
        return "You do not have permission to perform this action.";
      }
      if (status === 404) {
        return "The requested resource was not found.";
      }
    }

    if (axiosError.code === "ERR_NETWORK") {
      return "Network error. Please check your connection.";
    }

    if (axiosError.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return fallbackMessage;
}

export function handleError(
  error: unknown,
  options: HandleErrorOptions = {},
): string {
  const {
    fallbackMessage = "An error occurred",
    showToast = true,
    toastFn = toast.error,
    logError = true,
  } = options;

  const message = getErrorMessage(error, fallbackMessage);

  if (logError) {
    console.error("Error occurred:", error);
  }

  if (showToast) {
    toastFn(message);
  }

  return message;
}
