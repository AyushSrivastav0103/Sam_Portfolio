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

// ----------------------
// ✅ Google OAuth Setup
// ----------------------
const CREDENTIALS_PATH = path.resolve(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.resolve(process.cwd(), 'token.json');

let oauth2Client = null;

function getOAuthClient() {
  if (oauth2Client) return oauth2Client;
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
    console.warn('⚠️ Google OAuth credentials or token not found. Calendar integration will be skipped.');
    return null;
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  client.setCredentials(token);
  oauth2Client = client;
  return oauth2Client;
}

// ----------------------
// App Setup
// ----------------------
const messagesFile = path.resolve(process.cwd(), 'messages.json');
const bookingsFile = path.resolve(process.cwd(), 'bookings.json');

const app = express();
const port = process.env.PORT || 5174;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('tiny'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', apiLimiter);

// ----------------------
// Health Check
// ----------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ----------------------
// Contact Form
// ----------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body || {};
  if (website) return res.status(200).json({ success: true });
  if (!email || !message) return res.status(400).json({ error: 'email and message are required' });

  const payload = { name, email, message, ts: new Date().toISOString(), ip: req.ip };
  try {
    const existing = fs.existsSync(messagesFile)
      ? JSON.parse(fs.readFileSync(messagesFile, 'utf-8') || '[]')
      : [];
    existing.push(payload);
    fs.writeFileSync(messagesFile, JSON.stringify(existing, null, 2));

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
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to persist or email contact message:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
// Booking Helpers
// ----------------------
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 20);
const START_HOUR = Number(process.env.START_HOUR || 10);
const END_HOUR = Number(process.env.END_HOUR || 17);

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]');
  } catch {
    return [];
  }
}
function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function generateSlotsForDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return [];
  const slots = [];
  const start = new Date(y, m - 1, d, START_HOUR, 0);
  const end = new Date(y, m - 1, d, END_HOUR, 0);
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + SLOT_MINUTES * 60000)) {
    slots.push(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
  }
  return slots;
}

// ----------------------
// Availability Endpoint
// ----------------------
app.get('/api/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const allSlots = generateSlotsForDate(date);
  const bookings = readJsonSafe(bookingsFile);
  const bookedForDate = new Set(bookings.filter(b => b.date === date).map(b => b.time));
  const available = allSlots.filter(t => !bookedForDate.has(t));
  res.json({ date, slotMinutes: SLOT_MINUTES, startHour: START_HOUR, endHour: END_HOUR, available });
});

// ----------------------
// Booking Endpoint
// ----------------------
app.post('/api/book', async (req, res) => {
  const { name, email, date, time } = req.body || {};
  if (!email || !date || !time) return res.status(400).json({ error: 'email, date, and time are required' });

  const slots = generateSlotsForDate(date);
  if (!slots.includes(time)) return res.status(400).json({ error: 'invalid slot' });

  const bookings = readJsonSafe(bookingsFile);
  if (bookings.find(b => b.date === date && b.time === time)) {
    return res.status(409).json({ error: 'slot already booked' });
  }

  const booking = { id: `${date}-${time}`, name, email, date, time, durationMinutes: SLOT_MINUTES, ts: new Date().toISOString() };
  bookings.push(booking);

  try {
    writeJsonSafe(bookingsFile, bookings);

    // -------------------
    // Google Calendar
    // -------------------
    let joinUrl = process.env.MEETING_URL || 'https://meet.google.com';
    const client = getOAuthClient();
    if (client && process.env.GCAL_CALENDAR_ID) {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const tz = process.env.TIMEZONE || 'Asia/Kolkata';
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, hh, mm));
      const end = new Date(start.getTime() + SLOT_MINUTES * 60000);

      const event = await calendar.events.insert({
        calendarId: process.env.GCAL_CALENDAR_ID,
        sendUpdates: 'all',
        conferenceDataVersion: 1,
        requestBody: {
          summary: 'Discovery Call',
          description: `Discovery call with ${name || email}`,
          start: { dateTime: start.toISOString(), timeZone: tz },
          end: { dateTime: end.toISOString(), timeZone: tz },
          attendees: [{ email }],
          conferenceData: {
            createRequest: {
              requestId: `${date}-${time}-${email}`.replace(/[^a-zA-Z0-9]/g, ''),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      });
      joinUrl = event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || joinUrl;
    }

    // -------------------
    // Email Invite
    // -------------------
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const subject = `Discovery Call — ${date} ${time}`;
      const text = `Thanks for booking!\n\nDetails:\nDate: ${date}\nTime: ${time}\nJoin: ${joinUrl}\n`;

      const dtStart = new Date(`${date}T${time}:00Z`);
      const dtEnd = new Date(dtStart.getTime() + SLOT_MINUTES * 60000);
      const toIcs = dt => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${booking.id}@sam-portfolio`,
        `DTSTAMP:${toIcs(new Date())}`,
        `DTSTART:${toIcs(dtStart)}`,
        `DTEND:${toIcs(dtEnd)}`,
        `SUMMARY:Discovery Call`,
        `DESCRIPTION:Join link: ${joinUrl}\\nBooked for ${name || email}`,
        `ATTENDEE;CN=${name || email}:MAILTO:${email}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: email,
        subject,
        text,
        attachments: [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar; method=REQUEST; charset=UTF-8' }],
      });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Failed to persist or email booking:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
// Resume Download Log
// ----------------------
app.get('/api/resume', (req, res) => {
  console.log('Resume requested from', req.ip);
  res.json({ ok: true });
});

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
