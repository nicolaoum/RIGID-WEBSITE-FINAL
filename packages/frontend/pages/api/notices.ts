import type { NextApiRequest, NextApiResponse } from 'next';

// Mock notices data
const mockNotices = [
  {
    id: '1',
    title: 'Pool Maintenance - December 5th',
    content: 'The swimming pool will be closed for maintenance on December 5th from 9 AM to 5 PM.',
    type: 'maintenance',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'All Buildings',
  },
  {
    id: '2',
    title: 'Holiday Office Hours',
    content: 'The management office will have reduced hours during the holiday season. Please check the website for details.',
    type: 'announcement',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'All Buildings',
  },
  {
    id: '3',
    title: 'Elevator Inspection - RIGID 2 Stadiou',
    content: 'Annual elevator inspection will take place on December 10th. Elevators may be temporarily out of service.',
    type: 'maintenance',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'RIGID 2 Stadiou',
  },
  {
    id: '4',
    title: 'New Security System Active',
    content: 'Enhanced security cameras have been installed in all common areas. Your privacy is protected.',
    type: 'announcement',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'All Buildings',
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Return all notices
    return res.status(200).json(mockNotices);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
