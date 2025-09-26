// api/availability.js
export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { date } = req.query;
      
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
      
      return res.status(200).json({
        date,
        timezone: 'Asia/Kolkata',
        slotMinutes: 20,
        startHour: 10,
        endHour: 17,
        available: availableSlots
      });
      
    } catch (error) {
      console.error('Availability API error:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }
  }