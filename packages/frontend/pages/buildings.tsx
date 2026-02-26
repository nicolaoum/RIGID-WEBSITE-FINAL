import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Building, getBuildings } from '../lib/api';
import { fetchCurrentUser, isAuthenticated } from '../lib/auth';

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getBuildings();
      setBuildings(data);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    };
    fetchData();

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    // Server-side /api/logout clears HttpOnly cookies and redirects to Cognito
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Our Buildings - Rigid Residential</title>
        <meta name="description" content="Explore our residential buildings in Nicosia, Cyprus" />
      </Head>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-3xl font-extrabold tracking-tight text-slate-900">RIGID</Link>
            <div className="hidden md:flex items-center space-x-8">
              {['Home', 'Buildings', 'Portal', 'Contact'].map((item) => (
                <Link key={item} href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                  className={`text-base font-medium tracking-wide transition-colors ${item === 'Buildings' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm font-medium text-slate-600 hidden sm:inline">{user.email}</span>
                  <button onClick={handleLogout} className="text-base font-semibold px-5 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-all">Logout</button>
                </>
              ) : (
                <a href="/api/login" className="text-base font-semibold px-6 py-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all">Login</a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero header */}
      <section className="pt-28 pb-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">Our Properties</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Buildings</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Three premium residential buildings in prime Nicosia locations, each offering modern amenities and comfortable living spaces.
          </p>
        </div>
      </section>

      {/* Buildings Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {buildings.map((building) => (
              <div key={building.id} className="group rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border border-slate-100">
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden relative">
                  {getBuildingImage(building) ? (
                    <img src={getBuildingImage(building)} alt={building.name} className="w-full h-full object-cover object-[center_35%] transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-6xl">🏢</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {building.availableUnits} Available
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{building.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 flex items-center gap-1">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                    {building.address}, {building.city}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="text-slate-600"><strong className="text-slate-900">{building.totalUnits}</strong> Units</span>
                    <span className="w-px h-4 bg-slate-200" />
                    <span className="text-emerald-600 font-semibold">{building.availableUnits} Available</span>
                  </div>

                  {building.amenities && building.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {building.amenities.slice(0, 4).map((amenity, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-medium">{amenity}</span>
                      ))}
                      {building.amenities.length > 4 && (
                        <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-xs font-medium">+{building.amenities.length - 4}</span>
                      )}
                    </div>
                  )}

                  <Link href={`/units?building=${building.id}`}
                    className="block w-full text-center bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all duration-300">
                    View Available Units
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {buildings.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400">Loading buildings...</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Interested in one of our apartments?</h2>
          <p className="text-lg text-slate-500 mb-8">Get in touch with us and we'll help you find the perfect home.</p>
          <Link href="/contact" className="inline-flex items-center justify-center bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
