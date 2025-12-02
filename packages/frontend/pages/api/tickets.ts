import type { NextApiRequest, NextApiResponse } from 'next';

// Mock tickets data
const mockTickets = [
  {
    id: '1',
    title: 'Broken AC Unit',
    description: 'The air conditioning in unit 2A is not working properly.',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'RIGID 1 Pierias',
    unit: '2A',
  },
  {
    id: '2',
    title: 'Water Leak',
    description: 'Small leak under kitchen sink.',
    status: 'in-progress',
    priority: 'medium',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'RIGID 2 Stadiou',
    unit: '1B',
  },
  {
    id: '3',
    title: 'Parking Gate',
    description: 'Parking gate remote not working.',
    status: 'closed',
    priority: 'low',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    building: 'RIGID 3 Ektoros',
    unit: '3C',
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Return all tickets
    return res.status(200).json(mockTickets);
  }

  if (req.method === 'POST') {
    // Create new ticket
    const { title, description, priority, building, unit } = req.body;

    const newTicket = {
      id: String(mockTickets.length + 1),
      title,
      description,
      status: 'open',
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      building,
      unit,
    };

    mockTickets.unshift(newTicket);
    return res.status(201).json(newTicket);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
