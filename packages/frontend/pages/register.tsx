import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../lib/auth';
import { registerResident, getBuildings, Building } from '../lib/api';

export default function Register() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    unitNumber: '',
    buildingId: '',
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Pre-fill email if user is logged in
    if (currentUser?.email) {
      setFormData(prev => ({ ...prev, email: currentUser.email }));
    }

    const loadBuildings = async () => {
      try {
        const buildingsData = await getBuildings();
        setBuildings(buildingsData);
      } catch (err) {
        console.error('Error loading buildings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBuildings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.unitNumber) {
      setError('Email and unit number are required');
      return;
    }

    if (!user) {
      setError('You must be logged in to register as a resident');
      return;
    }

    try {
      await registerResident(formData);
      setSubmitted(true);
      setFormData({ email: '', unitNumber: '', buildingId: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Required</h2>
            <p className="text-gray-600 mb-8">You must be logged in to register as a resident.</p>
            <a
              href="/api/login"
              className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
            >
              Log In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register as a Resident</h1>
          <p className="text-gray-600 mb-8">
            Submit your registration request. Our management team will review and authorize your access.
          </p>

          {submitted ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-green-900 mb-2">Registration Request Submitted!</h3>
              <p className="text-green-700 mb-4">
                Thank you for registering. Your request has been submitted to our management team. You will be notified once your access is approved.
              </p>
              <Link
                href="/portal"
                className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Go to Portal
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none transition"
                  placeholder="your.email@example.com"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Your registered email address</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Number *</label>
                <input
                  type="text"
                  required
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none transition"
                  placeholder="e.g., 101, 2A, Unit 5"
                />
                <p className="text-xs text-gray-500 mt-1">Your apartment/unit number</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Building (Optional)</label>
                <select
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none transition"
                >
                  <option value="">Select your building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold text-lg"
                >
                  Submit Registration Request
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  Already a resident?{' '}
                  <Link href="/portal" className="text-gray-900 font-semibold hover:underline">
                    Go to Portal
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✓ You submit your registration with your email and unit information</li>
            <li>✓ Management reviews your request</li>
            <li>✓ Once approved, you'll have full access to the resident portal</li>
            <li>✓ View notices, submit maintenance tickets, and more!</li>
          </ul>
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
