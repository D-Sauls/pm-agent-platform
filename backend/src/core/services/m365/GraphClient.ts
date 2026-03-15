import { AppError } from "../../errors/AppError.js";

export class GraphClient {
  private readonly baseUrl = "https://graph.microsoft.com/v1.0";

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async get<T>(path: string, accessToken: string): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (response.status === 404) {
      throw new AppError("CLICKUP_RESOURCE_NOT_FOUND", `Graph resource ${path} was not found`, 404);
    }
    if (!response.ok) {
      throw new AppError("CONNECTOR_UNAVAILABLE", `Graph request failed with ${response.status}`, 502);
    }

    return (await response.json()) as T;
  }
}
