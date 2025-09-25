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
const resumeLogsFile = path.resolve(process.cwd(), 'resume-logs.json');

const app = express();
const port = process.env.PORT || 5174;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('tiny'));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many contact requests. Please try again later.' });
const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: 'Too many booking requests. Please try again later.' });

app.use('/api/', apiLimiter);
app.use('/api/contact', contactLimiter);
app.use('/api/book', bookingLimiter);

// ----------------------
// Email Transporter Setup
// ----------------------
function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not configured. Email notifications will be disabled.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

// ----------------------
// Health Check
// ----------------------
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      email: !!process.env.SMTP_HOST,
      calendar: !!getOAuthClient(),
      storage: fs.existsSync(messagesFile) || fs.existsSync(bookingsFile)
    }
  };
  res.json(health);
});

// ----------------------
// Contact Form (FIXED)
// ----------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body || {};
  
  // Honeypot check (if website field is filled, it's likely a bot)
  if (website) {
    console.log('🤖 Bot detected via honeypot');
    return res.status(200).json({ success: true }); // Fake success for bots
  }
  
  // Validation
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }
  
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (message.length < 10 || message.length > 5000) {
    return res.status(400).json({ error: 'Message must be between 10 and 5000 characters' });
  }

  const payload = { 
    name: name || 'Not provided', 
    email, 
    message, 
    timestamp: new Date().toISOString(), 
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  try {
    // Save to file
    const existing = fs.existsSync(messagesFile)
      ? JSON.parse(fs.readFileSync(messagesFile, 'utf-8') || '[]')
      : [];
    existing.push(payload);
    fs.writeFileSync(messagesFile, JSON.stringify(existing, null, 2));
    console.log(`📧 New contact form submission from ${email}`);

    // Get email recipients
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER; // Your email (Ayush)
    const clientEmail = process.env.CLIENT_EMAIL; // Shubham's email
    const recipients = [adminEmail];
    if (clientEmail) recipients.push(clientEmail);

    // Send notification emails
    const transporter = getEmailTransporter();
    if (transporter && recipients.length > 0) {
      // Email to admin/client (notification about new contact)
      await transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Portfolio'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        replyTo: email, // Reply directly to the person who submitted the form
        subject: `🆕 New Contact Form Submission from ${name || email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${name || 'Not provided'}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Date:</strong> ${new Date(payload.timestamp).toLocaleString()}</p>
              <p><strong>IP:</strong> ${payload.ip}</p>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h3 style="color: #555;">Message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <div style="margin-top: 20px; padding: 10px; background: #e8f4f8; border-radius: 8px;">
              <p style="margin: 0; color: #666;">
                💡 <strong>Tip:</strong> You can reply directly to this email to respond to ${name || 'the sender'}.
              </p>
            </div>
          </div>
        `,
        text: `New Contact Form Submission\n\nFrom: ${name || 'Not provided'}\nEmail: ${email}\nDate: ${new Date(payload.timestamp).toLocaleString()}\n\nMessage:\n${message}`
      });

      // Confirmation email to the person who submitted the form
      await transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Shubham Banger'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Thank you for reaching out!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank you for your message!</h2>
            <p>Hi ${name || 'there'},</p>
            <p>I've received your message and will get back to you as soon as possible, typically within 24-48 hours.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #555;">Your message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p>In the meantime, feel free to explore my portfolio or check out my recent projects.</p>
            <p>Best regards,<br>${process.env.SITE_NAME || 'Shubham Banger'}</p>
          </div>
        `,
        text: `Thank you for your message!\n\nHi ${name || 'there'},\n\nI've received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nBest regards,\n${process.env.SITE_NAME || 'Shubham Banger'}`
      });
      
      console.log(`✅ Notification emails sent to: ${recipients.join(', ')}`);
      console.log(`✅ Confirmation email sent to: ${email}`);
    }

    res.json({ success: true, message: 'Thank you for your message. I\'ll get back to you soon!' });
  } catch (err) {
    console.error('❌ Failed to process contact form:', err);
    // Still return success if we saved the message but email failed
    if (fs.existsSync(messagesFile)) {
      res.json({ success: true, message: 'Message received. I\'ll get back to you soon!' });
    } else {
      res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
  }
});

// ----------------------
// Booking Helpers
// ----------------------
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 20);
const START_HOUR = Number(process.env.START_HOUR || 10);
const END_HOUR = Number(process.env.END_HOUR || 17);
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

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
  if (!date) {
    return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
  }
  
  // Validate date format
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  const allSlots = generateSlotsForDate(date);
  const bookings = readJsonSafe(bookingsFile);
  const bookedForDate = new Set(bookings.filter(b => b.date === date).map(b => b.time));
  const available = allSlots.filter(t => !bookedForDate.has(t));
  
  res.json({ 
    date, 
    timezone: TIMEZONE,
    slotMinutes: SLOT_MINUTES, 
    startHour: START_HOUR, 
    endHour: END_HOUR, 
    available 
  });
});

// ----------------------
// Booking Endpoint (IMPROVED)
// ----------------------
app.post('/api/book', async (req, res) => {
  const { name, email, date, time } = req.body || {};
  
  // Validation
  if (!email || !date || !time) {
    return res.status(400).json({ error: 'Email, date, and time are required' });
  }
  
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const slots = generateSlotsForDate(date);
  if (!slots.includes(time)) {
    return res.status(400).json({ error: 'Invalid time slot' });
  }

  // Check for existing booking
  const bookings = readJsonSafe(bookingsFile);
  if (bookings.find(b => b.date === date && b.time === time)) {
    return res.status(409).json({ error: 'This slot is already booked. Please choose another time.' });
  }

  const booking = { 
    id: `${date}-${time}-${Date.now()}`, 
    name: name || 'Not provided', 
    email, 
    date, 
    time, 
    timezone: TIMEZONE,
    durationMinutes: SLOT_MINUTES, 
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  
  bookings.push(booking);

  try {
    writeJsonSafe(bookingsFile, bookings);
    console.log(`📅 New booking created: ${date} ${time} for ${email}`);

    // Google Calendar Integration
    let meetingLink = process.env.DEFAULT_MEETING_URL || 'https://meet.google.com';
    let calendarEventId = null;
    
    const client = getOAuthClient();
    if (client && process.env.GCAL_CALENDAR_ID) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = time.split(':').map(Number);
        const startTime = new Date(y, m - 1, d, hh, mm);
        const endTime = new Date(startTime.getTime() + SLOT_MINUTES * 60000);

        const event = await calendar.events.insert({
          calendarId: process.env.GCAL_CALENDAR_ID,
          sendUpdates: 'all',
          conferenceDataVersion: 1,
          requestBody: {
            summary: `Discovery Call with ${name || email}`,
            description: `Discovery call scheduled via portfolio website.\n\nAttendee: ${name || 'Not provided'}\nEmail: ${email}`,
            location: 'Google Meet',
            start: { dateTime: startTime.toISOString(), timeZone: TIMEZONE },
            end: { dateTime: endTime.toISOString(), timeZone: TIMEZONE },
            attendees: [
              { email: email },
              ...(process.env.CLIENT_EMAIL ? [{ email: process.env.CLIENT_EMAIL }] : [])
            ],
            conferenceData: {
              createRequest: {
                requestId: booking.id.replace(/[^a-zA-Z0-9]/g, ''),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 30 }, // 30 minutes before
              ],
            },
          },
        });
        
        calendarEventId = event.data.id;
        meetingLink = event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || meetingLink;
        console.log(`✅ Google Calendar event created: ${calendarEventId}`);
      } catch (calError) {
        console.error('⚠️ Failed to create Google Calendar event:', calError);
      }
    }

    // Get email recipients
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const clientEmail = process.env.CLIENT_EMAIL;

    // Send email notifications
    const transporter = getEmailTransporter();
    if (transporter) {
      // Notification to admin/client
      const recipients = [adminEmail];
      if (clientEmail) recipients.push(clientEmail);
      
      await transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Portfolio'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        subject: `📅 New Discovery Call Booked - ${date} ${time}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Discovery Call Booked</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
              <p><strong>Name:</strong> ${name || 'Not provided'}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time} (${TIMEZONE})</p>
              <p><strong>Duration:</strong> ${SLOT_MINUTES} minutes</p>
              <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
            </div>
            ${calendarEventId ? `<p style="color: #666;">✅ Calendar event created (ID: ${calendarEventId})</p>` : ''}
          </div>
        `
      });

      // Confirmation email to the person who booked
      const dtStart = new Date(`${date}T${time}:00`);
      const dtEnd = new Date(dtStart.getTime() + SLOT_MINUTES * 60000);
      const toIcs = dt => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Portfolio//Discovery Call//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${booking.id}@portfolio`,
        `DTSTAMP:${toIcs(new Date())}`,
        `DTSTART:${toIcs(dtStart)}`,
        `DTEND:${toIcs(dtEnd)}`,
        `SUMMARY:Discovery Call with ${process.env.SITE_NAME || 'Shubham Banger'}`,
        `DESCRIPTION:Join the call here: ${meetingLink}`,
        `LOCATION:${meetingLink}`,
        `ATTENDEE;CN="${name || email}";RSVP=TRUE:MAILTO:${email}`,
        `ORGANIZER;CN="${process.env.SITE_NAME || 'Shubham Banger'}":MAILTO:${clientEmail || adminEmail}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      await transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Shubham Banger'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `✅ Discovery Call Confirmed - ${date} at ${time}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Discovery Call is Confirmed!</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for booking a discovery call. I look forward to speaking with you!</p>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333;">Meeting Details</h3>
              <p><strong>📅 Date:</strong> ${date}</p>
              <p><strong>⏰ Time:</strong> ${time} (${TIMEZONE})</p>
              <p><strong>⏱️ Duration:</strong> ${SLOT_MINUTES} minutes</p>
              <p><strong>📍 Location:</strong> Online (Google Meet)</p>
              <p style="margin-top: 15px;">
                <a href="${meetingLink}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Join Meeting
                </a>
              </p>
            </div>
            
            <div style="background: #fff9e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📌 Tips for our call:</strong></p>
              <ul>
                <li>Please join 2-3 minutes early to test your audio/video</li>
                <li>Have any questions or topics you'd like to discuss ready</li>
                <li>Be in a quiet environment with stable internet</li>
              </ul>
            </div>
            
            <p>The calendar invite is attached to this email. You can add it to your calendar by clicking on the attachment.</p>
            <p>If you need to reschedule or have any questions, please reply to this email.</p>
            
            <p>Best regards,<br>${process.env.SITE_NAME || 'Shubham Banger'}</p>
          </div>
        `,
        text: `Your Discovery Call is Confirmed!\n\nDate: ${date}\nTime: ${time} (${TIMEZONE})\nDuration: ${SLOT_MINUTES} minutes\nJoin: ${meetingLink}\n\nSee you soon!`,
        attachments: [{
          filename: 'discovery-call.ics',
          content: icsContent,
          contentType: 'text/calendar; charset=UTF-8; method=REQUEST'
        }]
      });
      
      console.log(`✅ Confirmation emails sent successfully`);
    }

    res.json({ 
      success: true, 
      booking: { ...booking, meetingLink },
      message: 'Booking confirmed! Check your email for details.'
    });
    
  } catch (err) {
    console.error('❌ Failed to process booking:', err);
    // If we saved the booking but email failed, still return success
    if (fs.existsSync(bookingsFile)) {
      res.json({ 
        success: true, 
        booking,
        message: 'Booking confirmed! You will receive an email confirmation shortly.'
      });
    } else {
      res.status(500).json({ error: 'Failed to create booking. Please try again.' });
    }
  }
});

// ----------------------
// Resume Download Tracking
// ----------------------
app.get('/api/resume', (req, res) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer') || 'direct'
  };
  
  try {
    const logs = readJsonSafe(resumeLogsFile);
    logs.push(logEntry);
    writeJsonSafe(resumeLogsFile, logs);
    
    console.log(`📄 Resume downloaded from IP: ${logEntry.ip}`);
    
    // Optional: Send notification for resume downloads
    const transporter = getEmailTransporter();
    if (transporter && process.env.NOTIFY_RESUME_DOWNLOADS === 'true') {
      const recipients = [process.env.ADMIN_EMAIL || process.env.SMTP_USER];
      if (process.env.CLIENT_EMAIL) recipients.push(process.env.CLIENT_EMAIL);
      
      transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Portfolio'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        subject: '📄 Resume Downloaded',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h3>Someone downloaded the resume</h3>
            <p><strong>Time:</strong> ${new Date(logEntry.timestamp).toLocaleString()}</p>
            <p><strong>IP:</strong> ${logEntry.ip}</p>
            <p><strong>Referrer:</strong> ${logEntry.referrer}</p>
          </div>
        `
      }).catch(err => console.error('Failed to send resume download notification:', err));
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to log resume download:', err);
    res.json({ success: true }); // Don't break the user experience
  }
});

// ----------------------
// Admin Endpoints (Optional)
// ----------------------
// Get all messages
app.get('/api/admin/messages', (req, res) => {
  // Add authentication here in production
  const authToken = req.headers.authorization;
  if (authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const messages = readJsonSafe(messagesFile);
  res.json(messages);
});

// Get all bookings
app.get('/api/admin/bookings', (req, res) => {
  // Add authentication here in production
  const authToken = req.headers.authorization;
  if (authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const bookings = readJsonSafe(bookingsFile);
  res.json(bookings);
});

// ----------------------
// Error Handling
// ----------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'An unexpected error occurred', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// ----------------------
// Server Start
// ----------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📧 Email notifications: ${process.env.SMTP_HOST ? 'Enabled' : 'Disabled'}`);
  console.log(`📅 Google Calendar: ${getOAuthClient() ? 'Connected' : 'Not configured'}`);
  console.log(`🌍 Timezone: ${TIMEZONE}`);
  
  if (!process.env.CLIENT_EMAIL) {
    console.log('ℹ️  Tip: Set CLIENT_EMAIL in .env to send notifications to the client');
  }
  if (!process.env.ADMIN_EMAIL) {
    console.log('ℹ️  Using SMTP_USER as admin email. Set ADMIN_EMAIL to override.');
  }
});