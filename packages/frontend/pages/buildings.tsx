import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building, getBuildings } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

// Static image imports — bundled by Next.js into /_next/static/
import pieriasImg from '../public/pierias-building.jpg';
import stadiouImg from '../public/stadiou-building.jpg';

// Map building name keywords to imported images
const LOCAL_BUILDING_IMAGES: Record<string, { src: string }> = {
  'pierias': pieriasImg,
  'stadiou': stadiouImg,
};

function getBuildingImage(building: Building): string | undefined {
  const nameLower = building.name.toLowerCase();
  for (const [key, img] of Object.entries(LOCAL_BUILDING_IMAGES)) {
    if (nameLower.includes(key)) return img.src;
  }
  return building.imageUrl;
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getBuildings();
      setBuildings(data);
    };
    fetchData();
    
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('rigid_id_token');
    localStorage.removeItem('rigid_access_token');
    localStorage.removeItem('rigid_refresh_token');
    localStorage.removeItem('rigid_user');
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Rigid Residential
            </Link>
            <div className="flex gap-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/buildings" className="text-gray-900 font-semibold">Buildings</Link>
              <Link href="/portal" className="text-gray-600 hover:text-gray-900">Resident Portal</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 font-medium">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-gray-900 font-semibold"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href="/api/login"
                  className="text-gray-700 hover:text-gray-900 font-semibold"
                >
                  Login
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Buildings Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Buildings</h1>
          <p className="text-xl text-gray-600 mb-12">
            Explore our premium residential properties in Nicosia, Cyprus
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {buildings.map((building) => (
              <div key={building.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  {getBuildingImage(building) ? (
                    <img src={getBuildingImage(building)} alt={building.name} className="w-full h-full object-cover object-[center_35%]" />
                  ) : (
                    <span className="text-gray-400 text-lg flex items-center justify-center h-full">🏢</span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{building.name}</h3>
                  <p className="text-gray-600 mb-4">
                    {building.address}, {building.city}
                  </p>
                  <div className="flex justify-between text-sm text-gray-500 mb-4">
                    <span>{building.totalUnits} Total Units</span>
                    <span className="text-green-600 font-semibold">{building.availableUnits} Available</span>
                  </div>
                  {building.amenities && building.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-2">
                        {building.amenities.slice(0, 3).map((amenity, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link
                    href={`/units?building=${building.id}`}
                    className="block w-full bg-gray-900 text-white text-center py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    View Units
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
