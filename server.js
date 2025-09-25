import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// Resolve a safe absolute path for messages.json from the project root
const messagesFile = path.resolve(process.cwd(), 'messages.json');
const bookingsFile = path.resolve(process.cwd(), 'bookings.json');

const app = express();
const port = process.env.PORT || 5174;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('tiny'));

// Basic rate limit for API
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Contact endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body || {};
  // Honeypot field "website" should be empty
  if (website) return res.status(200).json({ success: true });
  if (!email || !message) {
    return res.status(400).json({ error: 'email and message are required' });
  }
  const payload = { name, email, message, ts: new Date().toISOString(), ip: req.ip };
  console.log('Contact submission:', payload);
  try {
    // Persist to JSON file
    const existing = fs.existsSync(messagesFile) ? JSON.parse(fs.readFileSync(messagesFile, 'utf-8') || '[]') : [];
    existing.push(payload);
    fs.writeFileSync(messagesFile, JSON.stringify(existing, null, 2));

    // Send email if SMTP configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.TO_EMAIL) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `Portfolio Contact <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: process.env.TO_EMAIL,
        subject: `New contact from ${name || email}`,
        text: `Name: ${name || '-'}\nEmail: ${email}\nMessage:\n${message}`,
      });
    }
  } catch (err) {
    console.error('Failed to persist or email contact message:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
  res.json({ success: true });
});

// --- Discovery Call Booking ---
// Helpers
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 20);
const START_HOUR = Number(process.env.START_HOUR || 10); // 10:00
const END_HOUR = Number(process.env.END_HOUR || 17); // 17:00 (exclusive end)

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const text = fs.readFileSync(filePath, 'utf-8') || '[]';
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateSlotsForDate(dateStr) {
  // dateStr: YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return [];
  const slots = [];
  const start = new Date(y, m - 1, d, START_HOUR, 0, 0, 0);
  const end = new Date(y, m - 1, d, END_HOUR, 0, 0, 0);
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + SLOT_MINUTES * 60000)) {
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

// GET /api/availability?date=YYYY-MM-DD
app.get('/api/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const allSlots = generateSlotsForDate(date);
  const bookings = readJsonSafe(bookingsFile);
  const bookedForDate = new Set(bookings.filter(b => b.date === date).map(b => b.time));
  const available = allSlots.filter(t => !bookedForDate.has(t));
  res.json({ date, slotMinutes: SLOT_MINUTES, startHour: START_HOUR, endHour: END_HOUR, available });
});

// POST /api/book { name, email, date: YYYY-MM-DD, time: HH:MM }
app.post('/api/book', async (req, res) => {
  const { name, email, date, time } = req.body || {};
  if (!email || !date || !time) return res.status(400).json({ error: 'email, date, and time are required' });
  const slots = generateSlotsForDate(date);
  if (!slots.includes(time)) return res.status(400).json({ error: 'invalid slot' });
  const bookings = readJsonSafe(bookingsFile);
  const conflict = bookings.find(b => b.date === date && b.time === time);
  if (conflict) return res.status(409).json({ error: 'slot already booked' });

  const booking = { id: `${date}-${time}`, name, email, date, time, durationMinutes: SLOT_MINUTES, ts: new Date().toISOString() };
  bookings.push(booking);
  try {
    writeJsonSafe(bookingsFile, bookings);
    // If Google Calendar is configured, create an event and rely on Google invite (single email to attendee)
    if (process.env.GCAL_CALENDAR_ID && (process.env.GCAL_SERVICE_ACCOUNT_JSON || process.env.GCAL_SERVICE_ACCOUNT_B64)) {
      const tz = process.env.TIMEZONE || 'America/Toronto';
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, hh, mm));
      const end = new Date(start.getTime() + SLOT_MINUTES * 60000);

      // Build service account credentials
      let creds;
      if (process.env.GCAL_SERVICE_ACCOUNT_B64) {
        creds = JSON.parse(Buffer.from(process.env.GCAL_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
      } else {
        creds = JSON.parse(process.env.GCAL_SERVICE_ACCOUNT_JSON);
      }

      const jwt = new google.auth.JWT(
        creds.client_email,
        undefined,
        creds.private_key,
        ['https://www.googleapis.com/auth/calendar.events']
      );
      const calendar = google.calendar({ version: 'v3', auth: jwt });

      await calendar.events.insert({
        calendarId: process.env.GCAL_CALENDAR_ID,
        sendUpdates: 'all',
        requestBody: {
          summary: 'Discovery Call',
          description: `Discovery call with ${name || email}`,
          start: { dateTime: start.toISOString(), timeZone: tz },
          end: { dateTime: end.toISOString(), timeZone: tz },
          attendees: [ { email } ],
        },
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Otherwise, fall back to one email to the attendee (no duplicate admin email)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const subject = `Discovery Call — ${date} ${time}`;
      const joinUrl = process.env.MEETING_URL || 'https://meet.google.com';
      const text = `Thanks for booking!\n\nDetails:\nDate: ${date}\nTime: ${time} (${SLOT_MINUTES} minutes)\nJoin: ${joinUrl}\n`;

      // Create ICS invite attachment
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      const dtStart = new Date(Date.UTC(y, m - 1, d, hh, mm));
      const dtEnd = new Date(dtStart.getTime() + SLOT_MINUTES * 60000);
      const toIcs = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const uid = `${date}-${time}@sam-portfolio`;
      const organizer = process.env.FROM_EMAIL || process.env.SMTP_USER;
      const ics = [
        'BEGIN:VCALENDAR',
        'PRODID:-//Sam Portfolio//Booking//EN',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcs(new Date())}`,
        `DTSTART:${toIcs(dtStart)}`,
        `DTEND:${toIcs(dtEnd)}`,
        'SUMMARY:Discovery Call',
        `DESCRIPTION:Join link: ${joinUrl}\\nBooked for ${name || email}`,
        `ORGANIZER;CN=Portfolio:${organizer}`,
        `ATTENDEE;CN=${name || email};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${email}`,
        `URL:${joinUrl}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      await transporter.sendMail({
        from: organizer,
        to: email,
        subject,
        text,
        attachments: [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar; method=REQUEST; charset=UTF-8' }]
      });
    }
  } catch (err) {
    console.error('Failed to persist or email booking:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
  res.json({ success: true, booking });
});

// Resume download logging
app.get('/api/resume', (req, res) => {
  console.log('Resume requested from', req.ip);
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


