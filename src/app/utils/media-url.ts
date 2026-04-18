const API_ORIGEM = 'http://localhost:3333';

export function resolverUrlMidiaApi(url: string | null | undefined): string {
  const u = (url ?? '').trim();
  if (!u) {
    return '';
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  return u.startsWith('/') ? API_ORIGEM + u : `${API_ORIGEM}/${u}`;
}
