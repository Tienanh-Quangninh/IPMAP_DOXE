// Link labels identify a shared URL, never a verified person.
export function isLinkCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
}

export function linkAttributionMessage(code: string | null): string {
  return `Mã link: ${code || '(link chung)'}\nPath: /${code || ''}\n`;
}

export function linkCodeFromPath(pathname: string): string | null {
  const match = /^\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let code: string;
  try {
    code = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!isLinkCode(code) || ['api', 'assets', 'images'].includes(code.toLowerCase())) return null;
  return code;
}
