import { loadDownloads, loadProgressQueue, saveDownloads, saveProgressQueue } from "./storage";
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
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({ type: "CACHE_URLS", urls });
}

export function registerDownload(record: DownloadRecord): void {
  const existing = loadDownloads().filter((entry) => entry.id !== record.id);
  saveDownloads([...existing, record]);
}

export function queueProgressSync(item: ProgressQueueItem): void {
  saveProgressQueue([...loadProgressQueue(), item]);
}

export async function flushProgressQueue(
  sender: (path: string, payload: Record<string, unknown>) => Promise<void>
): Promise<void> {
  const queue = loadProgressQueue();
  const remaining: ProgressQueueItem[] = [];

  for (const item of queue) {
    try {
      await sender(item.path, item.payload);
    } catch {
      remaining.push(item);
    }
  }

  saveProgressQueue(remaining);
}
