// Pure ICS (RFC 5545) calendar generation for the teacher portal.
// No Monday / Next.js dependencies — receives normalized events and returns
// the full text of a .ics file. All timed events are expressed in the
// Asia/Jerusalem timezone via an embedded VTIMEZONE definition.

export interface IcsEvent {
  /** Stable unique id, e.g. "meeting-80012@madrasa-portal". */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** "HH:mm" local (Israel) start time, or null for an all-day event. */
  startTime: string | null;
  /** Event length in minutes; defaults to 60 when null. */
  durationMinutes: number | null;
}

const CRLF = "\r\n";
const DEFAULT_DURATION_MINUTES = 60;
const TZID = "Asia/Jerusalem";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

/** Escapes text values per RFC 5545 §3.3.11: backslash, semicolon, comma, newlines. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds long content lines (RFC 5545 §3.1). Splitting is done on code points
 * (conservative 70 per line) so multibyte Hebrew text is never cut mid-char.
 */
function foldLine(line: string): string {
  const limit = 70;
  const codePoints = Array.from(line);

  if (codePoints.length <= limit) {
    return line;
  }

  const segments: string[] = [];

  for (let index = 0; index < codePoints.length; index += limit) {
    segments.push(codePoints.slice(index, index + limit).join(""));
  }

  return segments.join(`${CRLF} `);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** UTC basic format timestamp, e.g. 20260612T093000Z. */
function formatUtcTimestamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

function formatLocalDateTime(wall: WallClock): string {
  return `${wall.year}${pad(wall.month)}${pad(wall.day)}T${pad(wall.hours)}${pad(wall.minutes)}00`;
}

/**
 * Adds minutes to a wall-clock value using UTC date arithmetic as a neutral
 * container (no timezone conversion — input and output are local wall time).
 */
function addMinutes(wall: WallClock, minutes: number): WallClock {
  const container = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hours, wall.minutes + minutes),
  );

  return {
    year: container.getUTCFullYear(),
    month: container.getUTCMonth() + 1,
    day: container.getUTCDate(),
    hours: container.getUTCHours(),
    minutes: container.getUTCMinutes(),
  };
}

function parseEventStart(event: IcsEvent): WallClock | null {
  const dateMatch = ISO_DATE_PATTERN.exec(event.date.trim());

  if (!dateMatch) {
    return null;
  }

  const base: WallClock = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hours: 0,
    minutes: 0,
  };

  if (!event.startTime) {
    return base;
  }

  const timeMatch = TIME_PATTERN.exec(event.startTime.trim());

  if (!timeMatch) {
    return base;
  }

  return {
    ...base,
    hours: Math.min(23, Number(timeMatch[1])),
    minutes: Math.min(59, Number(timeMatch[2])),
  };
}

// Israel time: simplified-but-accurate recurring rules.
// DST starts on the Friday before the last Sunday of March (approximated as
// the last Friday of March) and ends on the last Sunday of October.
const VTIMEZONE_LINES = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:STANDARD",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0200",
  "TZNAME:IST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700327T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0300",
  "TZNAME:IDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

function buildEventLines(event: IcsEvent, dtstamp: string): string[] {
  const start = parseEventStart(event);

  if (!start) {
    return [];
  }

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${dtstamp}`,
  ];

  if (event.startTime) {
    const durationMinutes =
      event.durationMinutes && event.durationMinutes > 0
        ? event.durationMinutes
        : DEFAULT_DURATION_MINUTES;
    const end = addMinutes(start, durationMinutes);

    lines.push(
      `DTSTART;TZID=${TZID}:${formatLocalDateTime(start)}`,
      `DTEND;TZID=${TZID}:${formatLocalDateTime(end)}`,
    );
  } else {
    // No start time — emit a one-day all-day event (DTEND is exclusive).
    const nextDay = addMinutes(start, 24 * 60);

    lines.push(
      `DTSTART;VALUE=DATE:${start.year}${pad(start.month)}${pad(start.day)}`,
      `DTEND;VALUE=DATE:${nextDay.year}${pad(nextDay.month)}${pad(nextDay.day)}`,
    );
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

/**
 * Builds a complete VCALENDAR document (CRLF line endings, folded lines).
 * Events with a malformed date are skipped silently — callers are expected
 * to pre-filter meetings without a date.
 */
export function buildIcsCalendar(events: IcsEvent[]): string {
  const dtstamp = formatUtcTimestamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Madrasa//Teacher Portal//HE",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE_LINES,
  ];

  for (const event of events) {
    lines.push(...buildEventLines(event, dtstamp));
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join(CRLF) + CRLF;
}
