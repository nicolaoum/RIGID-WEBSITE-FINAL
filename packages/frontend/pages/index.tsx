import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getBuildings, Building } from '@/lib/api';
import { getCurrentUser, fetchCurrentUser, logout } from '@/lib/auth';

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

export default function Home() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    // Handle secure OAuth callback — tokens are in HttpOnly cookies, not in URL
    const { auth } = router.query;

    if (auth === 'success') {
      // Fetch user info from HttpOnly cookie via /api/me, then clean URL
      fetchCurrentUser().then(() => {
        window.location.href = '/';
      });
      return;
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
    <div className="min-h-screen bg-white">
      <Head>
        <title>Rigid Residential - Quality Homes in Nicosia</title>
        <meta name="description" content="Residential apartments in Nicosia, Cyprus" />
      </Head>

      <Navigation />

      {/* ── HERO ── Full-bleed image hero */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={stadiouImg.src}
            alt="Rigid Residential buildings"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <span className="inline-block text-emerald-400 font-semibold text-sm tracking-widest uppercase mb-4">
              Nicosia, Cyprus
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              Your Home,<br />
              Made&nbsp;Simple.
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-lg">
              Quality residential living across three buildings in the heart of Nicosia.
              Find your next apartment today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/buildings"
                className="inline-flex items-center justify-center bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5"
              >
                Browse Buildings
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link
                href="/portal"
                className="inline-flex items-center justify-center border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
              >
                Resident Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative z-20 -mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            <div className="p-6 md:p-8 text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">3</div>
              <div className="text-sm text-slate-500 mt-1 font-medium">Buildings</div>
            </div>
            <div className="p-6 md:p-8 text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">30</div>
              <div className="text-sm text-slate-500 mt-1 font-medium">Apartments</div>
            </div>
            <div className="p-6 md:p-8 text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-emerald-600">5</div>
              <div className="text-sm text-slate-500 mt-1 font-medium">Available Now</div>
            </div>
            <div className="p-6 md:p-8 text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">24/7</div>
              <div className="text-sm text-slate-500 mt-1 font-medium">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILDINGS ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">
              Our Properties
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Explore Our Buildings
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Three premium residential buildings in prime Nicosia locations, each with modern amenities and comfortable living spaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {buildings.map((building) => (
              <Link
                key={building.id}
                href={`/units?building=${building.id}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border border-slate-100"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden relative">
                  {getBuildingImage(building) ? (
                    <img
                      src={getBuildingImage(building)}
                      alt={building.name}
                      className="w-full h-full object-cover object-[center_35%] transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-6xl">🏢</span>
                    </div>
                  )}
                  {/* Available badge */}
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {building.availableUnits} Available
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                    {building.name}
                  </h3>
                  <p className="text-slate-500 text-sm mb-4 flex items-center gap-1">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                    {building.address}
                  </p>

                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="text-slate-600"><strong className="text-slate-900">{building.totalUnits}</strong> Units</span>
                    <span className="w-px h-4 bg-slate-200" />
                    <span className="text-emerald-600 font-semibold">{building.availableUnits} Available</span>
                  </div>

                  {building.amenities && building.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {building.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-medium">
                          {amenity}
                        </span>
                      ))}
                      {building.amenities.length > 3 && (
                        <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-xs font-medium">
                          +{building.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
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

      {/* ── WHY RIGID ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">
              Why Choose Us
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Living Made Easy
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              We take care of the details so you can focus on living.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
                ),
                title: 'Quality Apartments',
                desc: 'Well-maintained, modern apartments designed for comfortable everyday living in prime locations.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                ),
                title: 'Prime Locations',
                desc: 'Centrally located in Nicosia with easy access to shops, restaurants, and public transport.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.1-3.06a1.5 1.5 0 01-.54-2.04l3.06-5.1a1.5 1.5 0 012.04-.54l5.1 3.06a1.5 1.5 0 01.54 2.04l-3.06 5.1a1.5 1.5 0 01-2.04.54zM20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3" /></svg>
                ),
                title: 'Fast Maintenance',
                desc: 'Submit tickets through our resident portal and get issues resolved quickly by our responsive team.',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={pieriasImg.src}
            alt="Rigid Residential"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/75" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
            Already a Resident?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Access the resident portal to submit maintenance tickets, view announcements, and manage your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/portal"
              className="inline-flex items-center justify-center bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
            >
              Go to Portal
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ── NAVIGATION ──
function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className={`text-3xl font-extrabold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>
            RIGID
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            {['Home', 'Buildings', 'Portal', 'Contact'].map((item) => (
              <Link
                key={item}
                href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                className={`text-base font-medium tracking-wide transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className={`text-sm font-medium hidden sm:inline ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className={`text-base font-semibold px-5 py-2.5 rounded-lg transition-all ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
                >
                  Logout
                </button>
              </>
            ) : (
              <a
                href="/api/login"
                className={`text-base font-semibold px-6 py-3 rounded-lg transition-all ${scrolled ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm'}`}
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

// ── FOOTER ──
function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <h3 className="text-2xl font-extrabold tracking-tight mb-4">RIGID</h3>
            <p className="text-slate-400 leading-relaxed">
              Quality residential apartments in prime Nicosia locations. Your comfort is our priority.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Navigate</h4>
            <ul className="space-y-3">
              {[
                { label: 'Buildings', href: '/buildings' },
                { label: 'Available Units', href: '/units' },
                { label: 'Resident Portal', href: '/portal' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="mailto:info@rigidresidential.com" className="hover:text-white transition-colors">
                  info@rigidresidential.com
                </a>
              </li>
              <li>
                <a href="tel:+35725123456" className="hover:text-white transition-colors">
                  +357 25 123 456
                </a>
              </li>
              <li>Mon – Fri: 9:00 AM – 6:00 PM</li>
              <li>Nicosia, Cyprus</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">For Residents</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/portal" className="text-slate-400 hover:text-white transition-colors">
                  Resident Portal
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-400 hover:text-white transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <a href="tel:+35725123456" className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold">
                  Emergency Line
                </a>
              </li>
            </ul>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="border-t border-slate-800 py-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Rigid Residential. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Nicosia, Cyprus</p>
        </div>
      </div>
    </footer>
  );
}
