/**
 * The league runs on Eastern time. Deadlines are stored as UTC instants in the
 * database, but every wall-clock reading of one — display, admin editing,
 * default values — is expressed in Eastern regardless of where the viewer is.
 */
export const LEAGUE_TIME_ZONE = "America/New_York";

/**
 * Format a deadline for display in league time, always tagged with the zone
 * so an owner in another timezone isn't guessing.
 */
export function formatDeadline(
  deadline: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(deadline).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
    timeZone: LEAGUE_TIME_ZONE,
  });
}

/**
 * Eastern UTC offset in minutes for a given instant (300 for EST, 240 for EDT).
 */
function easternOffsetMinutes(instant: Date): number {
  // Format the instant as Eastern wall-clock, re-read it as UTC, and the
  // difference is the offset. Avoids hardcoding DST transition dates.
  const asEasternWallClock = new Date(
    instant.toLocaleString("en-US", { timeZone: LEAGUE_TIME_ZONE })
  );
  const asUtcWallClock = new Date(
    instant.toLocaleString("en-US", { timeZone: "UTC" })
  );
  return Math.round(
    (asUtcWallClock.getTime() - asEasternWallClock.getTime()) / 60000
  );
}

/**
 * Convert an Eastern wall-clock time to the UTC instant it represents.
 * Accepts the `YYYY-MM-DDTHH:mm` shape a datetime-local input produces.
 */
export function easternWallClockToUtc(wallClock: string): Date {
  const match = wallClock.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) {
    return new Date(NaN);
  }
  const [, year, month, day, hour, minute, second] = match;
  const asIfUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0)
  );

  // Offset depends on whether that date is in DST, which we can only know once
  // we have an approximate instant — one correction pass settles it except
  // for times inside the transition hour itself.
  const approximate = new Date(asIfUtc);
  const guess = new Date(asIfUtc + easternOffsetMinutes(approximate) * 60000);
  return new Date(asIfUtc + easternOffsetMinutes(guess) * 60000);
}

/**
 * Build the UTC instant for a given Eastern date and time-of-day.
 */
export function easternDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return easternWallClockToUtc(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
  );
}

/**
 * Render a UTC instant as the `YYYY-MM-DDTHH:mm` Eastern wall-clock string a
 * datetime-local input expects.
 */
export function utcToEasternWallClock(deadline: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(deadline));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // en-CA gives hour "24" for midnight; datetime-local needs "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
