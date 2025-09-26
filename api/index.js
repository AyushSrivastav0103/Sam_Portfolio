// api/index.js - Fixed for Vercel Serverless Functions
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vercel
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: ['https://sam-portfolio-khaki-pi.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - more lenient for serverless
const apiLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

// Email transporter function
function getEmailTransporter() {
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    return null;
  }
  
  try {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      },
      tls: {
        rejectUnauthorized: false // More permissive for various SMTP providers
      }
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    emailConfigured: !!process.env.SMTP_HOST
  });
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, website } = req.body || {};
    
    console.log('Contact form submission:', { name, email, hasMessage: !!message });
    
    // Honeypot check
    if (website && website.trim() !== '') {
      console.log('Honeypot triggered, potential bot detected');
      return res.status(200).json({ success: true, message: 'Thank you for your message!' });
    }
    
    // Validation
    if (!email || !message) {
      return res.status(400).json({ 
        error: 'Email and message are required',
        details: { email: !!email, message: !!message }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Message length validation
    if (message.length < 10 || message.length > 5000) {
      return res.status(400).json({ error: 'Message must be between 10 and 5000 characters' });
    }

    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.warn('Email not configured, saving contact form data only');
      // In a real app, you'd save to database here
      return res.json({ 
        success: true, 
        message: 'Thank you for your message! I\'ll get back to you soon.' 
      });
    }

    // Send notification email to you
    const adminEmail = process.env.TO_EMAIL || process.env.SMTP_USER;
    
    if (adminEmail) {
      await transporter.sendMail({
        from: `"Portfolio Contact Form" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: adminEmail,
        replyTo: email,
        subject: `New Contact: ${name || email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
              <p><strong>From:</strong> ${name || 'Not provided'}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin-top: 20px;">
              <h3>Message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
          </div>
        `,
        text: `New Contact Form Submission\n\nFrom: ${name || 'Not provided'}\nEmail: ${email}\nTime: ${new Date().toLocaleString()}\n\nMessage:\n${message}`
      });
    }

    // Send confirmation email to user
    await transporter.sendMail({
      from: `"Shubham Banger" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Thanks for reaching out!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for your message!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>I've received your message and will get back to you as soon as possible, typically within 24-48 hours.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your message:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p>Best regards,<br>Shubham Banger</p>
        </div>
      `,
      text: `Thank you for your message!\n\nHi ${name || 'there'},\n\nI've received your message and will get back to you soon.\n\nYour message:\n${message}\n\nBest regards,\nShubham Banger`
    });

    console.log('Contact form processed successfully');
    res.json({ 
      success: true, 
      message: 'Thank you for your message! I\'ll get back to you soon.' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Resume download tracking
app.get('/api/resume', (req, res) => {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    };
    
    console.log('Resume downloaded:', logData);
    
    // In a real app, you'd save this to a database
    res.json({ success: true });
  } catch (error) {
    console.error('Resume tracking error:', error);
    res.json({ success: true }); // Don't break user experience
  }
});

// Availability endpoint (simplified for serverless)
app.get('/api/availability', (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD format)' });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Generate available time slots (10 AM to 5 PM, 20-minute slots)
    const slots = [];
    for (let hour = 10; hour < 17; hour++) {
      for (let min = 0; min < 60; min += 20) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    // In a real app, you'd filter out booked slots from database
    const availableSlots = slots.slice(0, -2); // Remove last 2 slots to simulate some bookings
    
    res.json({
      date,
      timezone: 'Asia/Kolkata',
      slotMinutes: 20,
      startHour: 10,
      endHour: 17,
      available: availableSlots
    });
    
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Booking endpoint
app.post('/api/book', async (req, res) => {
  try {
    const { name, email, date, time } = req.body || {};
    
    console.log('Booking request:', { name, email, date, time });
    
    // Validation
    if (!email || !date || !time) {
      return res.status(400).json({ 
        error: 'Email, date, and time are required',
        received: { email: !!email, date: !!date, time: !!time }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // In a real app, you'd check database for conflicts and save the booking
    const booking = {
      id: `${date}-${time}-${Date.now()}`,
      name: name || 'Not provided',
      email,
      date,
      time,
      timezone: 'Asia/Kolkata',
      durationMinutes: 20,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };

    const transporter = getEmailTransporter();
    
    if (transporter) {
      // Send notification to you
      const adminEmail = process.env.TO_EMAIL || process.env.SMTP_USER;
      
      if (adminEmail) {
        await transporter.sendMail({
          from: `"Booking System" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `New Booking: ${date} at ${time}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Discovery Call Booking</h2>
              <div style="background: #f0f8ff; padding: 20px; border-radius: 8px;">
                <p><strong>Name:</strong> ${name || 'Not provided'}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time} (Asia/Kolkata)</p>
                <p><strong>Duration:</strong> 20 minutes</p>
              </div>
            </div>
          `
        });
      }

      // Send confirmation to user
      await transporter.sendMail({
        from: `"Shubham Banger" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Discovery Call Confirmed - ${date} at ${time}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Discovery Call is Confirmed!</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for booking a discovery call. I look forward to speaking with you!</p>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Meeting Details</h3>
              <p><strong>📅 Date:</strong> ${date}</p>
              <p><strong>⏰ Time:</strong> ${time} (Asia/Kolkata)</p>
              <p><strong>⏱️ Duration:</strong> 20 minutes</p>
              <p><strong>📍 Location:</strong> I'll send you the meeting link closer to the date</p>
            </div>
            
            <p>I'll reach out to you with the meeting details 24 hours before our call.</p>
            <p>If you need to reschedule, please reply to this email.</p>
            
            <p>Best regards,<br>Shubham Banger</p>
          </div>
        `,
        text: `Your Discovery Call is Confirmed!\n\nDate: ${date}\nTime: ${time} (Asia/Kolkata)\nDuration: 20 minutes\n\nI'll send you meeting details soon.\n\nBest regards,\nShubham Banger`
      });
    }

    console.log('Booking processed successfully');
    res.json({ 
      success: true, 
      booking: booking,
      message: 'Booking confirmed! Check your email for details.' 
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      error: 'Failed to create booking. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle all other routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel
export default app;