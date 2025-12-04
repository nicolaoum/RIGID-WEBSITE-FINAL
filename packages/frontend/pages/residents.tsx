import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../lib/auth';
import { addResident, getBuildings, Building } from '../lib/api';

export default function Residents() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [newAuthorization, setNewAuthorization] = useState({
    email: '',
    unitNumber: '',
    buildingId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);

      const userIsAdmin = currentUser?.groups?.includes('admin') || currentUser?.groups?.includes('staff') || false;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        const buildingsData = await getBuildings();
        setBuildings(buildingsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      await addResident(newAuthorization);
      setShowAuthForm(false);
      setNewAuthorization({
        email: '',
        unitNumber: '',
        buildingId: '',
      });
      setMessage('✓ Resident authorized successfully! They now have portal access.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error authorizing resident:', error);
      setMessage(`✗ Error: ${error.message || 'Failed to authorize resident'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-8">This page is only accessible to administrators and staff</p>
            <Link
              href="/"
              className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Authorize Residents</h1>
            <p className="text-gray-600 mt-2">Grant portal access by adding users to the resident group</p>
          </div>
          <button
            onClick={() => setShowAuthForm(!showAuthForm)}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
          >
            {showAuthForm ? 'Cancel' : '+ Authorize Resident'}
          </button>
        </div>

        {showAuthForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Authorize New Resident</h2>
            <p className="text-gray-600 mb-6">Enter the resident's email to grant them portal access. They must have created an account first.</p>
            
            <form onSubmit={handleAuthorizeResident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newAuthorization.email}
                  onChange={(e) => setNewAuthorization({ ...newAuthorization, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="resident@example.com"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                <input
                  type="text"
                  required
                  value={newAuthorization.unitNumber}
                  onChange={(e) => setNewAuthorization({ ...newAuthorization, unitNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., 101, 2A"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building (Optional)</label>
                <select
                  value={newAuthorization.buildingId}
                  onChange={(e) => setNewAuthorization({ ...newAuthorization, buildingId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="">Select Building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Authorizing...' : 'Authorize Resident'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to authorize a resident:</h3>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>1. Ensure the resident has already created an account on the website</li>
            <li>2. Enter their email address, unit number, and building (optional)</li>
            <li>3. Click "Authorize Resident"</li>
            <li>4. They will now be added to the resident group and have full portal access</li>
            <li>5. They can submit tickets, view notices, and more!</li>
          </ol>
        </div>
      </div>
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
    localStorage.removeItem('rigid_id_token');
    localStorage.removeItem('rigid_access_token');
    localStorage.removeItem('rigid_refresh_token');
    localStorage.removeItem('rigid_user');
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
            <Link href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Home
            </Link>
            <Link href="/buildings" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Buildings
            </Link>
            <Link href="/portal" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Portal
            </Link>
            {user?.groups?.includes('admin') && (
              <Link href="/residents" className="text-gray-700 hover:text-gray-900 px-3 py-2 font-medium">
                Residents
              </Link>
            )}
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
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
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
