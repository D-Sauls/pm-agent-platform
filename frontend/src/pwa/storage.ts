import type { DownloadRecord, ProgressQueueItem } from "./types";

const DOWNLOADS_KEY = "offline_downloads";
const PROGRESS_QUEUE_KEY = "progress_queue";

function scopedKey(baseKey: string, scope: string): string {
  return `${baseKey}:${scope}`;
}

export function loadDownloads(scope = "default"): DownloadRecord[] {
  const raw = localStorage.getItem(scopedKey(DOWNLOADS_KEY, scope));
  return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
}

export function saveDownloads(records: DownloadRecord[], scope = "default"): void {
  localStorage.setItem(scopedKey(DOWNLOADS_KEY, scope), JSON.stringify(records));
}

export function replaceDownloads(records: DownloadRecord[], scope = "default"): void {
  saveDownloads(records, scope);
}

export function clearDownloads(scope = "default"): void {
  localStorage.removeItem(scopedKey(DOWNLOADS_KEY, scope));
}

export function loadProgressQueue(scope = "default"): ProgressQueueItem[] {
  const raw = localStorage.getItem(scopedKey(PROGRESS_QUEUE_KEY, scope));
  return raw ? (JSON.parse(raw) as ProgressQueueItem[]) : [];
}

export function saveProgressQueue(items: ProgressQueueItem[], scope = "default"): void {
  localStorage.setItem(scopedKey(PROGRESS_QUEUE_KEY, scope), JSON.stringify(items));
}

export function clearProgressQueue(scope = "default"): void {
  localStorage.removeItem(scopedKey(PROGRESS_QUEUE_KEY, scope));
}
