import type { ActionExecutionResponse } from "@/lib/actions/types";

type NavigateFunction = (options: { to: string }) => void;

/**
 * Honour redirects (including ".." → parent) and trigger browser downloads
 * based on the backend's action_result metadata.
 */
export function handleActionResult(
  response: ActionExecutionResponse,
  navigate: NavigateFunction,
): void {
  if (!response.action_result) {
    return;
  }

  if ("path" in response.action_result) {
    const path = (response.action_result as { path: string }).path;
    if (path === "..") {
      const currentPath = window.location.pathname;
      const parentPath = currentPath.substring(
        0,
        currentPath.lastIndexOf("/"),
      );
      if (parentPath) {
        navigate({ to: parentPath });
      }
    } else {
      navigate({ to: path });
    }
  } else if (
    "url" in response.action_result &&
    "filename" in response.action_result
  ) {
    const { url, filename } = response.action_result as {
      url: string;
      filename: string;
    };
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
