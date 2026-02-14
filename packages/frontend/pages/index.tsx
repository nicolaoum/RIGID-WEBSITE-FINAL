import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getBuildings, Building } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

// Map building names to local images in /public/
const LOCAL_BUILDING_IMAGES: Record<string, string> = {
  'pierias': '/pierias-building.jpg',
  'stadiou': '/stadiou-building.jpg',
  // Add more as images are added, e.g.:
  // 'ektoros': '/ektoros-building.jpg',
};

function getBuildingImage(building: Building): string | undefined {
  // Check for a local image match first (match on building name keywords)
  const nameLower = building.name.toLowerCase();
  for (const [key, path] of Object.entries(LOCAL_BUILDING_IMAGES)) {
    if (nameLower.includes(key)) return path;
  }
  // Fall back to the imageUrl from the database
  return building.imageUrl;
}

export default function Home() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    // Handle OAuth callback tokens from URL
    const { access_token, id_token, refresh_token } = router.query;
    
    if (id_token && typeof id_token === 'string') {
      console.log('Saving tokens from callback...');
      localStorage.setItem('rigid_id_token', id_token);
      
      if (access_token && typeof access_token === 'string') {
        localStorage.setItem('rigid_access_token', access_token);
      }
      
      if (refresh_token && typeof refresh_token === 'string') {
        localStorage.setItem('rigid_refresh_token', refresh_token);
      }
      
      // Parse and save user info from ID token
      try {
        const base64Url = id_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const tokenData = JSON.parse(jsonPayload);
        
        // Create user object with properly formatted groups
        const user = {
          ...tokenData,
          groups: tokenData['cognito:groups'] || [],
          username: tokenData['cognito:username'] || tokenData.username,
        };
        
        localStorage.setItem('rigid_user', JSON.stringify(user));
        console.log('User saved:', user.email, 'Groups:', user.groups);
      } catch (error) {
        console.error('Failed to parse user token:', error);
      }
      
      // Clean up URL
      router.replace('/', undefined, { shallow: true });
    }
    
    const loadBuildings = async () => {
      try {
        const buildingsData = await getBuildings();
        setBuildings(buildingsData);
      } catch (error) {
        console.error('Failed to load buildings:', error);
      }
    };
    loadBuildings();
  }, [router.query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Rigid Residential - Quality Homes in Nicosia</title>
        <meta name="description" content="Residential apartments in Nicosia, Cyprus" />
      </Head>

      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-white py-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gray-900 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Welcome to<br />
              <span className="text-gray-700">Rigid Residential</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Quality residential living in Nicosia, Cyprus. Find your next home in one of our three buildings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/buildings"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
              >
                View Buildings
              </Link>
              <Link
                href="/contact"
                className="inline-block border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Buildings Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Our Buildings</h2>
            <p className="text-lg text-gray-600">
              Explore our residential properties in Nicosia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {buildings.map((building) => (
              <Link
                key={building.id}
                href={`/units?building=${building.id}`}
                className="group block bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 h-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-4 focus:ring-offset-gray-50"
              >
                <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  {getBuildingImage(building) ? (
                    <img
                      src={getBuildingImage(building)}
                      alt={building.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <span className="text-gray-500 text-6xl">🏢</span>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{building.name}</h3>
                  <p className="text-gray-600 mb-4">
                    📍 {building.address}
                  </p>
                  
                  <div className="flex justify-between items-center mb-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-500">Total Units</div>
                      <div className="text-2xl font-bold text-gray-900">{building.totalUnits}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Available</div>
                      <div className="text-2xl font-bold text-green-600">{building.availableUnits}</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Amenities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {building.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                      {building.amenities.length > 3 && (
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                          +{building.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="block w-full text-center bg-gray-900 text-white py-3 rounded-lg font-semibold transition group-hover:bg-gray-800">
                    View Available Apartments
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {buildings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Loading buildings...</p>
            </div>
          )}
        </div>
      </section>

      {/* About Rigid Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Rigid?</h2>
            <p className="text-lg text-gray-600">Simple, reliable residential management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg">
              <div className="text-4xl mb-3">🏠</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Quality Homes</h3>
              <p className="text-gray-600">
                Well-maintained apartments designed for comfortable living
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg">
              <div className="text-4xl mb-3">📍</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Great Locations</h3>
              <p className="text-gray-600">
                Convenient areas in Nicosia with easy access to what you need
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg">
              <div className="text-4xl mb-3">🔧</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Responsive Support</h3>
              <p className="text-gray-600">
                Quick maintenance assistance whenever you need it
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Navigation Component
function Navigation() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('rigid_id_token');
    localStorage.removeItem('rigid_access_token');
    localStorage.removeItem('rigid_refresh_token');
    localStorage.removeItem('rigid_user');
    
    // Redirect to logout endpoint
    window.location.href = '/api/logout';
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Rigid Residential
          </Link>
          <div className="hidden md:flex space-x-1">
            <Link href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 font-medium">
              Home
            </Link>
            <Link href="/buildings" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Buildings
            </Link>
            <Link href="/portal" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Portal
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Contact
            </Link>
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
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Rigid Residential</h3>
            <p className="text-gray-400">Quality residential apartments in Nicosia, Cyprus.</p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/buildings" className="hover:text-white transition">Buildings</Link></li>
              <li><Link href="/units" className="hover:text-white transition">Available Apartments</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-2 text-gray-400">
              <p className="flex items-center">
                <span className="mr-2">📧</span>
                <a href="mailto:info@rigidresidential.com" className="hover:text-white transition">
                  info@rigidresidential.com
                </a>
              </p>
              <p className="flex items-center">
                <span className="mr-2">📞</span>
                <a href="tel:+35725123456" className="hover:text-white transition">
                  +357 25 123 456
                </a>
              </p>
              <p className="flex items-center">
                <span className="mr-2">🕐</span>
                <span>Mon-Fri: 9AM-6PM</span>
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">For Residents</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/portal" className="hover:text-white transition">Resident Portal</Link></li>
              <li>
                <a href="tel:+35725123456" className="text-red-400 hover:text-red-300 transition font-semibold">
                  Emergency: +357 25 123 456
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Rigid Residential. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
