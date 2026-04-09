const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function toApiUrl(url: string): string {
  if (!url.startsWith('/api')) {
    return url;
  }

  return `${basePath}${url}`;
}
