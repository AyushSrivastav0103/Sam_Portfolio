// api/book.js
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// Google Calendar setup (simplified for serverless)
function getOAuthClient() {
  // For serverless, we'll use service account or skip calendar integration
  // This is a simplified version - you may need to adjust based on your setup
  if (!process.env.GCAL_SERVICE_ACCOUNT_JSON) {
    console.warn('Google Calendar not configured');
    return null;
  }
  
  try {
    const credentials = JSON.parse(process.env.GCAL_SERVICE_ACCOUNT_JSON);
    const client = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    return client;
  } catch (error) {
    console.error('Failed to setup Google Calendar:', error);
    return null;
  }
}

function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured');
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

// Booking helpers
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 20);
const START_HOUR = Number(process.env.START_HOUR || 10);
const END_HOUR = Number(process.env.END_HOUR || 17);
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
        subject: `📅 New Discovery Call Booked - ${date} at ${time}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Discovery Call Booked</h2>
            <p>Hi there,</p>
            <p>A new discovery call has been booked through the portfolio website.</p>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333;">Meeting Details</h3>
              <p><strong>📅 Date:</strong> ${date}</p>
              <p><strong>⏰ Time:</strong> ${time} (${TIMEZONE})</p>
              <p><strong>⏱️ Duration:</strong> ${SLOT_MINUTES} minutes</p>
              <p><strong>📍 Location:</strong> Online (Google Meet)</p>
              <p><strong>👤 Attendee:</strong> ${name || 'Not provided'} (${email})</p>
              <p style="margin-top: 15px;">
                <a href="${meetingLink}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Join Meeting
                </a>
              </p>
            </div>
            
            <div style="background: #fff9e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📌 Meeting Preparation:</strong></p>
              <ul>
                <li>Please join 2-3 minutes early to test your audio/video</li>
                <li>Have any questions or topics you'd like to discuss ready</li>
                <li>Be in a quiet environment with stable internet</li>
              </ul>
            </div>
            
            ${calendarEventId ? `<p style="color: #666; background: #e8f5e8; padding: 10px; border-radius: 5px;">✅ Calendar event created (ID: ${calendarEventId})</p>` : ''}
            
            <p>Best regards,<br>${process.env.SITE_NAME || 'Portfolio System'}</p>
          </div>
        `,
        text: `New Discovery Call Booked!\n\nDate: ${date}\nTime: ${time} (${TIMEZONE})\nDuration: ${SLOT_MINUTES} minutes\nAttendee: ${name || 'Not provided'} (${email})\nJoin: ${meetingLink}\n\nMeeting Preparation:\n- Join 2-3 minutes early\n- Have questions ready\n- Be in a quiet environment\n\nBest regards,\n${process.env.SITE_NAME || 'Portfolio System'}`
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
    return res.status(500).json({ 
      error: 'Failed to create booking. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}