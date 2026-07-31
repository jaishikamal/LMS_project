/**
 * Resolves the `?date=YYYY-MM-DD` query param (set by EventCalendar when a day
 * is picked) into a local start/end-of-day range. Falls back to today when the
 * param is missing or unparseable.
 */
export const resolveSelectedDay = (
  dateParam: string | string[] | undefined
) => {
  const raw = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  // Parse as local midnight; `new Date("YYYY-MM-DD")` alone would be UTC and
  // could land on the previous day for negative offsets.
  const parsed = raw ? new Date(`${raw}T00:00:00`) : null;
  const start =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();

  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};
