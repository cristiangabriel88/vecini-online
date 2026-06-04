/** Build a t.me deep link for a given bot username and start payload. */
export function buildTelegramDeepLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername}?start=${code}`;
}
