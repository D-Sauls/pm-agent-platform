export interface SecretProvider {
  getSecret(key: string): Promise<string | null>;
}

export class EnvSecretProvider implements SecretProvider {
  async getSecret(key: string): Promise<string | null> {
    const value = process.env[key];
    if (!value) return null;
    return value;
  }
}
