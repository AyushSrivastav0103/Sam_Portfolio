// api/book.js
import nodemailer from 'nodemailer';

function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
    tls: {
      rejectUnauthorized: false
    }
  });
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
            `,
            text: `New Booking: ${date} at ${time}\nFrom: ${name || 'Not provided'}\nEmail: ${email}`
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
          `,
          text: `Discovery Call Confirmed!\n\nDate: ${date}\nTime: ${time} (Asia/Kolkata)\nDuration: 20 minutes\n\nI'll send meeting details soon.\n\nBest regards,\nShubham Banger`
        });
        console.log('Booking confirmation sent to user');
        
      } catch (emailError) {
        console.error('Booking email failed:', emailError);
      }
    } else {
      console.log('Email transporter not configured, skipping emails');
    }

    return res.status(200).json({ 
      success: true, 
      booking: booking,
      message: 'Booking confirmed! Check your email for details.' 
    });

  } catch (error) {
    console.error('Booking API error:', error);
    return res.status(500).json({ 
      error: 'Failed to create booking. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}