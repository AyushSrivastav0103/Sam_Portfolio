// api/index.js - Vercel Serverless Function
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

app.use('/api/', apiLimiter);
app.use('/api/contact', contactLimiter);

// Email transporter
function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body || {};
  
  // Honeypot check
  if (website) {
    return res.status(200).json({ success: true });
  }
  
  // Validation
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }
  
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const transporter = getEmailTransporter();
    if (transporter) {
      // Send notification email
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: process.env.TO_EMAIL || process.env.SMTP_USER,
        replyTo: email,
        subject: `New Contact: ${name || email}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name || 'Not provided'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });

      // Send confirmation
      await transporter.sendMail({
        from: `"Shubham Banger" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Thanks for reaching out!',
        html: `
          <p>Hi ${name || 'there'},</p>
          <p>Thanks for your message! I'll get back to you soon.</p>
          <p>Best regards,<br>Shubham</p>
        `
      });
    }

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Resume download tracking
app.get('/api/resume', (req, res) => {
  console.log('Resume downloaded');
  res.json({ success: true });
});

// Simplified booking (remove file operations for serverless)
app.get('/api/availability', (req, res) => {
  const { date } = req.query;
  
  // Simple static slots for demo
  const slots = ['10:00', '11:00', '14:00', '15:00', '16:00'];
  
  res.json({
    date,
    timezone: 'Asia/Kolkata',
    slotMinutes: 20,
    available: slots
  });
});

app.post('/api/book', async (req, res) => {
  const { name, email, date, time } = req.body;
  
  if (!email || !date || !time) {
    return res.status(400).json({ error: 'Email, date, and time required' });
  }

  try {
    const transporter = getEmailTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Booking System" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: process.env.TO_EMAIL || process.env.SMTP_USER,
        subject: `New Booking: ${date} at ${time}`,
        html: `
          <h2>New Discovery Call Booking</h2>
          <p><strong>Name:</strong> ${name || 'Not provided'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        `
      });
    }

    res.json({ 
      success: true, 
      message: 'Booking confirmed! Check email for details.' 
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Export the Express app as a Vercel serverless function
export default (req, res) => {
  return app(req, res);
};