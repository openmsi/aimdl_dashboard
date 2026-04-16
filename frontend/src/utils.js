export function parseIgsn(igsn) {
  if (!igsn) return { base: "", suffix: null };
  const hyphenIdx = igsn.indexOf("-");
  if (hyphenIdx === -1) return { base: igsn, suffix: null };
  return {
    base: igsn.slice(0, hyphenIdx),
    suffix: igsn.slice(hyphenIdx),
  };
}

export function baseIgsn(igsn) {
  return parseIgsn(igsn).base;
}

export function timeAgo(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
