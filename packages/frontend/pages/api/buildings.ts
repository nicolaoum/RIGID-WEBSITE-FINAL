import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const buildings = [
    {
      id: 'bldg-001',
      name: 'RIGID 1 Pierias',
      address: 'Pierias Street',
      city: 'Limassol',
      state: '',
      zip: '',
      totalUnits: 12,
      availableUnits: 2,
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Elevator', 'Parking', 'Storage'],
    },
    {
      id: 'bldg-002',
      name: 'RIGID 2 Stadiou',
      address: 'Stadiou Street',
      city: 'Limassol',
      state: '',
      zip: '',
      totalUnits: 8,
      availableUnits: 1,
      imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Elevator', 'Parking', 'Balconies'],
    },
    {
      id: 'bldg-003',
      name: 'RIGID 3 Ektoros',
      address: 'Ektoros Street',
      city: 'Limassol',
      state: '',
      zip: '',
      totalUnits: 10,
      availableUnits: 2,
      imageUrl: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Elevator', 'Parking', 'Storage', 'Modern Design'],
    },
  ];

  res.status(200).json(buildings);
}
