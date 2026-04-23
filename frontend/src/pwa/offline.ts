import {
  clearDownloads,
  clearProgressQueue,
  loadDownloads,
  loadProgressQueue,
  replaceDownloads,
  saveDownloads,
  saveProgressQueue
} from "./storage";
import type { DownloadRecord, ProgressQueueItem } from "./types";

export function canDownloadByPolicy(policy: string): { allowed: boolean; reason?: string } {
  if (policy === "allow_anywhere" || policy === "authenticated_only") {
    return { allowed: true };
  }
  if (policy === "vpn_only") {
    return { allowed: false, reason: "Offline download is restricted to VPN-connected environments." };
  }
  return { allowed: false, reason: "Offline download is restricted to approved office network ranges." };
}

export async function cacheUrlsForOffline(urls: string[]): Promise<void> {
  if (!urls.length || !("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({ type: "CACHE_URLS", urls });
}

export async function invalidateUrlsForOffline(urls: string[]): Promise<void> {
  if (!urls.length || !("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_URLS", urls });
}

export function registerDownload(record: DownloadRecord, scope = "default"): void {
  const existing = loadDownloads(scope).filter((entry) => entry.id !== record.id);
  saveDownloads([...existing, record], scope);
}

export function replaceManagedDownloads(records: DownloadRecord[], scope = "default"): void {
  replaceDownloads(records, scope);
}

export function clearManagedDownloads(scope = "default"): void {
  clearDownloads(scope);
}

export function queueProgressSync(item: ProgressQueueItem, scope = "default"): void {
  saveProgressQueue([...loadProgressQueue(scope), item], scope);
}

export async function flushProgressQueue(
  sender: (path: string, payload: Record<string, unknown>) => Promise<void>,
  scope = "default"
): Promise<void> {
  const queue = loadProgressQueue(scope);
  const remaining: ProgressQueueItem[] = [];

  for (const item of queue) {
    try {
      await sender(item.path, item.payload);
    } catch {
      remaining.push(item);
    }
  }

  saveProgressQueue(remaining, scope);
}

export function clearQueuedProgress(scope = "default"): void {
  clearProgressQueue(scope);
}
