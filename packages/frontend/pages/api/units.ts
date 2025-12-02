import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory storage (in real app, this would be a database)
let units = [
  {
    id: 'unit-001',
    buildingId: 'bldg-001',
    buildingName: 'RIGID 1 Pierias',
    unitNumber: '101',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    rent: 1200,
    available: true,
    availableDate: '2025-01-15',
    imageUrl: null,
  },
  {
    id: 'unit-002',
    buildingId: 'bldg-001',
    buildingName: 'RIGID 1 Pierias',
    unitNumber: '204',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1150,
    rent: 1500,
    available: true,
    availableDate: '2025-02-01',
    imageUrl: null,
  },
  {
    id: 'unit-003',
    buildingId: 'bldg-002',
    buildingName: 'RIGID 2 Stadiou',
    unitNumber: '102',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    rent: 1100,
    available: true,
    availableDate: '2025-01-20',
    imageUrl: null,
  },
  {
    id: 'unit-004',
    buildingId: 'bldg-003',
    buildingName: 'RIGID 3 Ektoros',
    unitNumber: '301',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1200,
    rent: 1600,
    available: true,
    availableDate: '2025-01-10',
    imageUrl: null,
  },
  {
    id: 'unit-005',
    buildingId: 'bldg-003',
    buildingName: 'RIGID 3 Ektoros',
    unitNumber: '205',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1000,
    rent: 1300,
    available: true,
    availableDate: '2025-02-15',
    imageUrl: null,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET - Return all units
  if (req.method === 'GET') {
    res.status(200).json(units);
    return;
  }

  // POST - Add new unit
  if (req.method === 'POST') {
    const newUnit = {
      ...req.body,
      id: `unit-${Date.now()}`,
    };
    units.push(newUnit);
    res.status(201).json(newUnit);
    return;
  }

  // DELETE - Remove unit by ID
  if (req.method === 'DELETE') {
    const { id } = req.query;
    units = units.filter(unit => unit.id !== id);
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
