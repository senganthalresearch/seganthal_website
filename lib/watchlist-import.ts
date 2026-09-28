export function parseWatchlistEntries(text: string) {
  return [...new Set(text.split(/[,;\r\n]+/).map(entry => entry.trim().replace(/\s+/g, " ")).filter(Boolean))];
}
