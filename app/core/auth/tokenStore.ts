let accessToken: string | null = null;
let tokenVersion = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAccessTokenVersion(): number {
  return tokenVersion;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  tokenVersion += 1;
}

export function clearAccessToken(): void {
  accessToken = null;
  tokenVersion += 1;
}
