// api/index.js - Proper Vercel Serverless Function
import nodemailer from 'nodemailer';

// Email transporter function
function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // Use TLS
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main handler function
export default async function handler(req, res) {
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, method } = req;
  console.log(`${method} ${url}`);

  try {
    // Health check endpoint
    if (url === '/api/health' && method === 'GET') {
      return res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        emailConfigured: !!process.env.SMTP_HOST
      });
    }

    // Contact form endpoint
    if (url === '/api/contact' && method === 'POST') {
      const { name, email, message, website } = req.body || {};
      
      console.log('Contact form submission:', { name, email, hasMessage: !!message });
      
      // Honeypot check
      if (website && website.trim() !== '') {
        console.log('Honeypot triggered - bot detected');
        return res.json({ success: true, message: 'Thank you for your message!' });
      }
      
      // Validation
      if (!email || !message) {
        return res.status(400).json({ 
          error: 'Email and message are required' 
        });
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Message length validation
      if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ 
          error: 'Message must be between 10 and 5000 characters' 
        });
      }

      // Try to send emails
      const transporter = getEmailTransporter();
      
      if (transporter) {
        try {
          // Send notification email
          const adminEmail = process.env.TO_EMAIL || process.env.SMTP_USER;
          
          if (adminEmail) {
            await transporter.sendMail({
              from: `"Portfolio Contact" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
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
              `
            });
            console.log('Notification email sent to:', adminEmail);
          }

          // Send confirmation email
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
            `
          });
          console.log('Confirmation email sent to:', email);
          
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Continue even if email fails
        }
      }

      return res.json({ 
        success: true, 
        message: 'Thank you for your message! I\'ll get back to you soon.' 
      });
    }

    // Resume download tracking
    if (url === '/api/resume' && method === 'GET') {
      const logData = {
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      };
      
      console.log('Resume downloaded:', logData);
      return res.json({ success: true });
    }

    // Availability endpoint
    if (url.startsWith('/api/availability') && method === 'GET') {
      const urlParams = new URL(req.url, `http://${req.headers.host}`);
      const date = urlParams.searchParams.get('date');
      
      if (!date) {
        return res.status(400).json({ 
          error: 'Date parameter is required (YYYY-MM-DD format)' 
        });
      }
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ 
          error: 'Invalid date format. Use YYYY-MM-DD' 
        });
      }
      
      // Generate time slots (10 AM to 5 PM, 20-minute intervals)
      const slots = [];
      for (let hour = 10; hour < 17; hour++) {
        for (let min = 0; min < 60; min += 20) {
          const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
      
      // Simulate some booked slots (in production, you'd check a database)
      const availableSlots = slots.slice(0, -3); // Remove last 3 slots to simulate bookings
      
      return res.json({
        date,
        timezone: 'Asia/Kolkata',
        slotMinutes: 20,
        startHour: 10,
        endHour: 17,
        available: availableSlots
      });
    }

    // Booking endpoint
    if (url === '/api/book' && method === 'POST') {
      const { name, email, date, time } = req.body || {};
      
      console.log('Booking request:', { name, email, date, time });
      
      // Validation
      if (!email || !date || !time) {
        return res.status(400).json({ 
          error: 'Email, date, and time are required' 
        });
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Create booking object
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

      // Try to send booking emails
      const transporter = getEmailTransporter();
      
      if (transporter) {
        try {
          // Send notification to admin
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
            console.log('Booking notification sent to admin');
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
                
                <p>I'll reach out with meeting details 24 hours before our call.</p>
                <p>If you need to reschedule, please reply to this email.</p>
                
                <p>Best regards,<br>Shubham Banger</p>
              </div>
            `
          });
          console.log('Booking confirmation sent to user');
          
        } catch (emailError) {
          console.error('Booking email failed:', emailError);
          // Continue even if email fails
        }
      }

      return res.json({ 
        success: true, 
        booking: booking,
        message: 'Booking confirmed! Check your email for details.' 
      });
    }

    // Route not found
    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}