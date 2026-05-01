function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

export function getApiBase(): string {
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitApiUrl) {
    return trimTrailingSlash(explicitApiUrl);
  }

  const explicitApiBase = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (explicitApiBase) {
    return trimTrailingSlash(explicitApiBase);
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) {
    return `https://${domain}/api`;
  }

  return "/api";
}
