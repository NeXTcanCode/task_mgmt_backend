// tzOffset is JS Date.getTimezoneOffset() in minutes (UTC - local), e.g. India = -330.
// Returns the UTC start/end of the user's "today" and the local date string.
const dayRange = (tzOffset = 0, now = new Date()) => {
  const offsetMs = tzOffset * 60 * 1000;

  // Shift "now" into the user's local time, then read the date parts in UTC
  const local = new Date(now.getTime() - offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  const start = new Date(Date.UTC(y, m, d) + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { start, end, date };
};

module.exports = dayRange;
