import type { DownloadRecord, EmployeeSession, ProgressQueueItem } from "./types";

const SESSION_KEY = "employee_session";
const DOWNLOADS_KEY = "offline_downloads";
const PROGRESS_QUEUE_KEY = "progress_queue";

export function loadSession(): EmployeeSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as EmployeeSession) : null;
}

export function saveSession(session: EmployeeSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadDownloads(): DownloadRecord[] {
  const raw = localStorage.getItem(DOWNLOADS_KEY);
  return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
}

export function saveDownloads(records: DownloadRecord[]): void {
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records));
}

export function loadProgressQueue(): ProgressQueueItem[] {
  const raw = localStorage.getItem(PROGRESS_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as ProgressQueueItem[]) : [];
}

export function saveProgressQueue(items: ProgressQueueItem[]): void {
  localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(items));
}
