const DAY_MS = 24 * 60 * 60 * 1000;

// Time logs that overlap [from, to): finished logs that ended after `from`,
// plus the running one. Catches sessions that cross midnight, which a plain
// "startTime is inside the window" filter misses.
// Each $or branch has its own index: { userId, endTime } and the partial running-timer index.
const overlapFilter = (match, from, to) => ({
  $or: [
    { ...match, endTime: { $gt: from }, startTime: { $lt: to } },
    { ...match, endTime: { $type: "null" }, startTime: { $lt: to } },
  ],
});

// Seconds of a log that fall inside [from, to). A running log counts up to now.
const secondsWithin = (log, from, to, now = new Date()) => {
  const start = Math.max(log.startTime.getTime(), from.getTime());
  const end = Math.min((log.endTime || now).getTime(), to.getTime());
  return Math.max(0, Math.round((end - start) / 1000));
};

// The user's local calendar day "YYYY-MM-DD" for an instant (tzOffset as in dayRange.js)
const localDate = (date, tzOffset = 0) =>
  new Date(date.getTime() - tzOffset * 60 * 1000).toISOString().slice(0, 10);

module.exports = { DAY_MS, overlapFilter, secondsWithin, localDate };
