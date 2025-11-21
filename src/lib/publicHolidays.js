// Central list of Indian public holidays.
// Update this file each year with the holiday dates for your region/company.
// Dates are stored as ISO local date strings: 'YYYY-MM-DD'.

export const PUBLIC_HOLIDAYS = [
  // 2025 examples (update as needed)
  { date: "2025-01-26", name: "Republic Day" },
  { date: "2025-08-15", name: "Independence Day" },
  { date: "2025-10-02", name: "Gandhi Jayanti" },
  
  // Add observed festival/company holidays below
  // { date: "2025-11-01", name: "Diwali" },
];

export function getHolidayByDate(dateString) {
  if (!dateString) return null;
  // Try cache/localStorage first
  const year = dateString.slice(0, 4);
  try {
    const key = `publicHolidays_${year}`;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    const list = raw ? JSON.parse(raw) : PUBLIC_HOLIDAYS.filter(h => h.date.startsWith(`${year}-`));
    return list.find((h) => h.date === dateString) || null;
  } catch (e) {
    return PUBLIC_HOLIDAYS.find((h) => h.date === dateString) || null;
  }
}

export function isPublicHoliday(dateString) {
  return getHolidayByDate(dateString) !== null;
}

export default {
  PUBLIC_HOLIDAYS,
  getHolidayByDate,
  isPublicHoliday,
};

// --- Google Calendar integration helpers ---
// Fetch public holiday events from a Google Calendar (requires VITE_GOOGLE_API_KEY)
export async function fetchHolidaysFromGoogle(year) {
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'en.indian#holiday@group.v.calendar.google.com';
  if (!API_KEY) throw new Error('VITE_GOOGLE_API_KEY is not set');

  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Calendar API error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const events = Array.isArray(data.items) ? data.items : [];
  const holidays = events.map(ev => {
    // All-day events usually have start.date (YYYY-MM-DD). Fallback to start.dateTime.
    const date = ev.start?.date || (ev.start?.dateTime ? ev.start.dateTime.slice(0,10) : null);
    return date ? { date, name: ev.summary || 'Holiday' } : null;
  }).filter(Boolean);

  // store to localStorage for offline/caching
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`publicHolidays_${year}`, JSON.stringify(holidays));
    }
  } catch (e) {
    // ignore storage errors
  }

  return holidays;
}

// Ensure holidays for a given year are available (tries localStorage, then Google, then fallback static list)
export async function ensureHolidays(year) {
  const key = `publicHolidays_${year}`;
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  try {
    const list = await fetchHolidaysFromGoogle(year);
    return list;
  } catch (err) {
    // fallback to static list filtered by year
    return PUBLIC_HOLIDAYS.filter(h => h.date.startsWith(`${year}-`));
  }
}
