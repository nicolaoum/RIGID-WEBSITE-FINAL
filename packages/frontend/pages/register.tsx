 import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchCurrentUser, isAuthenticated } from '../lib/auth';
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
    phoneNumber: '',
  });

  useEffect(() => {
    const init = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      // Pre-fill email if user is logged in
      if (currentUser?.email) {
        setFormData(prev => ({ ...prev, email: currentUser.email }));
      }

      // Auto-populate apartment number from user profile
      if (currentUser?.['custom:apartmentNumber']) {
        setFormData(prev => ({ ...prev, unitNumber: currentUser['custom:apartmentNumber'] || '' }));
      }
    };

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

    init();
    loadBuildings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.unitNumber || !formData.phoneNumber) {
      setError('Email, unit number, and phone number are required');
      return;
    }

    if (!user) {
      setError('You must be logged in to register as a resident');
      return;
    }

    try {
      await registerResident(formData);
      setSubmitted(true);
      setFormData({ email: '', unitNumber: '', buildingId: '', phoneNumber: '' });
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-lg text-gray-600 mb-8">Please sign in to continue with resident registration.</p>
            <a
              href="/api/login"
              className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl group"
            >
              Sign In
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-gray-100">
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Register as a Resident</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Submit your registration request. Our management team will review and authorize your portal access.
            </p>
          </div>

          {submitted ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-900">Registration Submitted!</h3>
              </div>
              <p className="text-green-800 mb-6 text-lg leading-relaxed">
                Thank you for registering. Your request has been submitted to our management team. You will be notified once your access is approved.
              </p>
              <Link
                href="/portal"
                className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg hover:shadow-xl group"
              >
                Go to Portal
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700 font-semibold">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed focus:ring-0 transition-colors text-base"
                  placeholder="your.email@example.com"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-2 ml-1">Your registered email address</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apartment Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors text-base"
                  placeholder="e.g., 101, 2A"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors text-base"
                  placeholder="+357 99 123456"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Building (Optional)
                </label>
                <select
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-gray-900 focus:ring-0 transition-colors text-base"
                >
                  <option value="">Select a building</option>
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
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl hover:bg-gray-800 transition font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  Submit Registration Request
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600">
                  Already a resident?{' '}
                  <Link href="/portal" className="text-gray-900 font-semibold hover:text-gray-700 transition-colors">
                    Go to Portal →
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold text-blue-900 mb-4">How it works</h3>
          <ul className="space-y-3">
            {[
              'Submit your registration with your email and unit information',
              'Management reviews your request for verification',
              'Once approved, you\'ll have full access to the resident portal',
              'View notices, submit maintenance tickets, and more!',
            ].map((step, index) => (
              <li key={index} className="flex items-start text-blue-900">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-blue-800 leading-relaxed">{step}</span>
              </li>
            ))}
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
    const init = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    };
    init();
  }, []);

  const handleLogout = () => {
    // Server-side /api/logout clears HttpOnly cookies and redirects to Cognito
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
