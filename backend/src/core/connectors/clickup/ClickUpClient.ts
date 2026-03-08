import { AppError } from "../../errors/AppError.js";

export interface ClickUpListResponse {
  id: string;
  name: string;
  status?: { status: string };
  space?: { id: string; name: string };
  folder?: { id: string; name: string };
}

export interface ClickUpTaskResponse {
  id: string;
  name: string;
  description?: string;
  status?: { status: string; type?: string };
  assignees?: Array<{ id: string; username?: string }>;
  due_date?: string | null;
  priority?: { priority?: string | null };
  tags?: Array<{ name: string }>;
}

export interface ClickUpTimeEntryResponse {
  id: string;
  task?: { id?: string; name?: string };
  user?: { id?: string; username?: string };
  start?: string;
  duration?: string;
  description?: string;
  billable?: boolean;
  tags?: Array<{ name: string }>;
}

export interface ClickUpClient {
  getList(listId: string, apiKey: string, baseUrl?: string): Promise<ClickUpListResponse>;
  getTasks(listId: string, apiKey: string, baseUrl?: string): Promise<ClickUpTaskResponse[]>;
  getTimeEntries(
    teamId: string,
    apiKey: string,
    baseUrl?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ClickUpTimeEntryResponse[]>;
}

const DEFAULT_BASE_URL = "https://api.clickup.com/api/v2";

export class HttpClickUpClient implements ClickUpClient {
  async getList(listId: string, apiKey: string, baseUrl?: string): Promise<ClickUpListResponse> {
    return this.request<ClickUpListResponse>(`${this.base(baseUrl)}/list/${listId}`, apiKey);
  }

  async getTasks(listId: string, apiKey: string, baseUrl?: string): Promise<ClickUpTaskResponse[]> {
    const response = await this.request<{ tasks?: ClickUpTaskResponse[] }>(
      `${this.base(baseUrl)}/list/${listId}/task?include_closed=true&subtasks=true`,
      apiKey
    );
    return response.tasks ?? [];
  }

  async getTimeEntries(
    teamId: string,
    apiKey: string,
    baseUrl?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ClickUpTimeEntryResponse[]> {
    const query = new URLSearchParams();
    if (startDate) query.set("start_date", String(startDate.getTime()));
    if (endDate) query.set("end_date", String(endDate.getTime()));
    query.set("include_task_tags", "true");
    const response = await this.request<{ data?: ClickUpTimeEntryResponse[] }>(
      `${this.base(baseUrl)}/team/${teamId}/time_entries?${query.toString()}`,
      apiKey
    );
    return response.data ?? [];
  }

  private base(baseUrl?: string): string {
    return (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private async request<T>(url: string, apiKey: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json"
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new AppError("CONNECTOR_AUTH_FAILED", "ClickUp authentication failed", 401, {
        url,
        status: response.status
      });
    }
    if (response.status === 404) {
      throw new AppError("CLICKUP_RESOURCE_NOT_FOUND", "ClickUp resource not found", 404, { url });
    }
    if (!response.ok) {
      throw new AppError("CONNECTOR_UNAVAILABLE", "ClickUp API unavailable", 503, {
        url,
        status: response.status
      });
    }

    return (await response.json()) as T;
  }
}
