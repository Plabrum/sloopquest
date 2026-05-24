import type { ActionExecutionResponse } from "@/lib/actions/types";

/**
 * Pre-claim the clipboard during the user-activation window, resolving the
 * text once `responsePromise` settles. Without this, awaiting the action
 * fetch first burns the user gesture and Safari (plus strict-gesture Chrome)
 * silently rejects a later `writeText`.
 *
 * Returns true if the claim was registered — callers should then skip any
 * post-await `writeText` fallback.
 */
export function preclaimClipboardFromActionResponse(
  responsePromise: Promise<ActionExecutionResponse>,
): boolean {
  if (
    typeof ClipboardItem === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function"
  ) {
    return false;
  }

  const blobPromise = responsePromise.then((r) => {
    if (
      r.action_result &&
      "type" in r.action_result &&
      r.action_result.type === "copy_to_clipboard"
    ) {
      return new Blob([r.action_result.text], { type: "text/plain" });
    }
    throw new Error("not-a-copy-action");
  });

  try {
    void navigator.clipboard
      .write([new ClipboardItem({ "text/plain": blobPromise })])
      .catch(() => {});
    return true;
  } catch {
    return false;
  }
}
