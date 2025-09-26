// api/contact.js
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
    const { name, email, message, website } = req.body || {};
    
    console.log('Contact form submission:', { name, email, hasMessage: !!message });
    
    // Honeypot check
    if (website && website.trim() !== '') {
      console.log('Honeypot triggered - bot detected');
      return res.status(200).json({ success: true, message: 'Thank you for your message!' });
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
            `,
            text: `New Contact: ${name || 'Not provided'}\nEmail: ${email}\nMessage:\n${message}`
          });
          console.log('Notification email sent');
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
          `,
          text: `Thank you for your message!\n\nHi ${name || 'there'},\n\nI'll get back to you soon.\n\nYour message:\n${message}\n\nBest regards,\nShubham Banger`
        });
        console.log('Confirmation email sent');
        
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    } else {
      console.log('Email transporter not configured, skipping emails');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Thank you for your message! I\'ll get back to you soon.' 
    });

  } catch (error) {
    console.error('Contact API error:', error);
    return res.status(500).json({ 
      error: 'Failed to send message. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}