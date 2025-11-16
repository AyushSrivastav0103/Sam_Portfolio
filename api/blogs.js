// api/blogs.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // CORS headers (same pattern as other API routes)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const filePath = path.join(process.cwd(), 'blogs.json');
    const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '[]';
    let blogs = [];

    try {
      blogs = JSON.parse(raw || '[]');
    } catch (e) {
      console.error('Failed to parse blogs.json:', e);
      blogs = [];
    }

    res.status(200).json({ blogs });
  } catch (err) {
    console.error('Failed to load blogs:', err);
    res.status(500).json({ error: 'Failed to load blogs' });
  }
}
