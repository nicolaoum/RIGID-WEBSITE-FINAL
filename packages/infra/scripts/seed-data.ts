import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const buildings = [
  {
    id: 'bldg-001',
    name: 'RIGID 1 Pierias',
    address: 'Pierias Street, Nicosia, Cyprus',
    totalUnits: 12,
    availableUnits: 2,
    description: 'Modern residential building in the heart of Nicosia',
    amenities: ['Parking', 'Elevator', 'Security', 'Garden'],
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
  },
  {
    id: 'bldg-002',
    name: 'RIGID 2 Stadiou',
    address: 'Stadiou Street, Nicosia, Cyprus',
    totalUnits: 8,
    availableUnits: 1,
    description: 'Student accommodation with modern amenities, perfect for university students',
    amenities: ['Parking', 'Elevator', 'Study Rooms', 'High-Speed WiFi', 'Laundry'],
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
  },
  {
    id: 'bldg-003',
    name: 'RIGID 3 Ektoros',
    address: 'Ektoros Street, Nicosia, Cyprus',
    totalUnits: 10,
    availableUnits: 2,
    description: 'Luxury living with stunning views in central Nicosia',
    amenities: ['Parking', 'Elevator', 'Concierge', 'Roof Terrace'],
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  },
];

const units = [
  {
    id: 'unit-001',
    buildingId: 'bldg-001',
    unitNumber: '101',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 850,
    price: 1200,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    description: 'Cozy 2-bedroom apartment with modern amenities',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'unit-002',
    buildingId: 'bldg-001',
    unitNumber: '205',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1200,
    price: 1800,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    description: 'Spacious 3-bedroom apartment with balcony',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'unit-003',
    buildingId: 'bldg-002',
    unitNumber: '302',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 600,
    price: 950,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    description: 'Modern studio perfect for professionals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'unit-004',
    buildingId: 'bldg-003',
    unitNumber: '401',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1000,
    price: 1500,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    description: 'Luxury 2-bedroom with premium finishes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'unit-005',
    buildingId: 'bldg-003',
    unitNumber: '502',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    price: 2200,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    description: 'Penthouse with stunning city views',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedData() {
  console.log('Seeding buildings...');
  
  for (const building of buildings) {
    await docClient.send(
      new PutCommand({
        TableName: 'rigid-buildings',
        Item: building,
      })
    );
    console.log(`✓ Added building: ${building.name}`);
  }

  console.log('\nSeeding units...');
  
  for (const unit of units) {
    await docClient.send(
      new PutCommand({
        TableName: 'rigid-units',
        Item: unit,
      })
    );
    console.log(`✓ Added unit: ${unit.unitNumber} in building ${unit.buildingId}`);
  }

  console.log('\n✅ Seeding complete!');
}

seedData().catch(console.error);
