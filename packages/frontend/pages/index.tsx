import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getBuildings, Building } from '@/lib/api';

export default function Home() {
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const buildingsData = await getBuildings();
        setBuildings(buildingsData);
      } catch (error) {
        console.error('Failed to load buildings:', error);
      }
    };
    loadBuildings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Rigid Residential - Premium Living in Limassol</title>
        <meta name="description" content="Premium residential buildings in Limassol, Cyprus" />
      </Head>

      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Premium Living in Nicosia
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Experience modern comfort and convenience in our three thoughtfully designed residential buildings in the heart of Nicosia, Cyprus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/buildings"
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition text-lg"
            >
              View Our Buildings
            </Link>
            <Link
              href="/contact"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition text-lg"
            >
              Contact Us
            </Link>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">3</div>
              <div className="text-gray-300 text-lg">Premium Buildings</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">30</div>
              <div className="text-gray-300 text-lg">Total Apartments</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-gray-300 text-lg">Maintenance Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Buildings Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Buildings</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from three exceptional residential buildings, each offering unique amenities and modern living spaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  {building.imageUrl ? (
                    <img
                      src={building.imageUrl}
                      alt={building.name}
                      className="w-full h-full object-cover"
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

                  <Link
                    href={`/units?building=${building.id}`}
                    className="block w-full text-center bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
                  >
                    View Available Apartments
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {buildings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Loading buildings...</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Rigid Residential</h2>
            <p className="text-xl text-gray-600">Premium living experience with professional management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Modern Apartments</h3>
              <p className="text-gray-600">
                Thoughtfully designed living spaces with contemporary finishes and layouts
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Prime Location</h3>
              <p className="text-gray-600">
                Located in desirable areas of Nicosia with easy access to amenities
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">🔧</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Round-the-clock maintenance and responsive property management
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
            <a
              href="/api/login"
              className="text-gray-700 hover:text-gray-900 font-semibold"
            >
              Login
            </a>
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
            <p className="text-gray-400">Premium living spaces designed for modern life in Nicosia, Cyprus.</p>
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
