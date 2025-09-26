import 'dotenv/config';
import { google } from 'googleapis';

async function main() {
  try {
    // Load credentials from .env
    let creds;
    if (process.env.GCAL_SERVICE_ACCOUNT_B64) {
      creds = JSON.parse(Buffer.from(process.env.GCAL_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
    } else if (process.env.GCAL_SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.GCAL_SERVICE_ACCOUNT_JSON);
    } else {
      throw new Error('No service account credentials found in .env');
    }

    const calendarId = process.env.GCAL_CALENDAR_ID;
    if (!calendarId) throw new Error('GCAL_CALENDAR_ID not set in .env');

    const jwt = new google.auth.JWT(
      creds.client_email,
      undefined,
      creds.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );
    const calendar = google.calendar({ version: 'v3', auth: jwt });

    // Try to list upcoming events
    const res = await calendar.events.list({
      calendarId,
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: new Date().toISOString(),
    });
    console.log('✅ Successfully accessed calendar! Upcoming events:');
    for (const event of res.data.items || []) {
      console.log(`- ${event.summary} (${event.start?.dateTime || event.start?.date})`);
    }
    if (!res.data.items?.length) {
      console.log('No upcoming events found.');
    }
  } catch (err) {
    console.error('❌ Failed to access Google Calendar:', err.message);
    if (err.response?.data) {
      console.error('Google API error:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

main();
