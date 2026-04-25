import {
  clearDownloads,
  clearProgressQueue,
  loadDownloads,
  loadProgressQueue,
  replaceDownloads,
  saveDownloads,
  saveProgressQueue
} from "./storage.js";
import type { DownloadRecord, ProgressQueueItem } from "./types";

const CONTENT_CACHE = "learnhub-content-v3";

export function canDownloadByPolicy(policy: string): { allowed: boolean; reason?: string } {
  if (policy === "allow_anywhere" || policy === "authenticated_only") {
    return { allowed: true };
  }
  if (policy === "vpn_only") {
    return { allowed: false, reason: "Offline download is restricted to VPN-connected environments." };
  }
  return { allowed: false, reason: "Offline download is restricted to approved office network ranges." };
}

function toAbsoluteUrl(url: string): string {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost";
  return new URL(url, origin).toString();
}

export async function cacheUrlsForOffline(urls: string[]): Promise<boolean> {
  if (!urls.length || typeof caches === "undefined" || typeof fetch === "undefined") {
    return false;
  }

  try {
    const cache = await caches.open(CONTENT_CACHE);
    const results = await Promise.all(
      urls.map(async (url) => {
        const absoluteUrl = toAbsoluteUrl(url);
        const response = await fetch(absoluteUrl, { credentials: "same-origin" });
        if (!response.ok) {
          return false;
        }
        await cache.put(absoluteUrl, response.clone());
        return true;
      })
    );
    return results.every(Boolean);
  } catch {
    return false;
  }
}

export async function invalidateUrlsForOffline(urls: string[]): Promise<void> {
  if (!urls.length) {
    return;
  }

  if (typeof caches !== "undefined") {
    const cache = await caches.open(CONTENT_CACHE);
    await Promise.all(urls.map((url) => cache.delete(toAbsoluteUrl(url))));
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_URLS", urls });
  }
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


