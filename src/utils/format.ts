// Slovak plural for the member count: 1 člen, 2-4 členovia, 0 and 5+ členov.
export function memberCount(count: number) {
  if (count === 1) return '1 člen';
  if (count >= 2 && count <= 4) return `${count} členovia`;
  return `${count} členov`;
}
