import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { name, email, phone, message, unitId } = req.body;

    console.log('Inquiry received:', { name, email, phone, message, unitId });

    // In a real app, you would save this to a database
    // For now, just return success
    return res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry! We will contact you within 24 hours.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
