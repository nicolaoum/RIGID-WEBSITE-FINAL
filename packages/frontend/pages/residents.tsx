import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../lib/auth';
import { getResidents, addResident, deleteResident, getBuildings, Resident, Building } from '../lib/api';

export default function Residents() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({
    email: '',
    name: '',
    unitNumber: '',
    buildingId: '',
    phoneNumber: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);

      const userIsAdmin = currentUser?.groups?.includes('admin') || false;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        const [residentsData, buildingsData] = await Promise.all([
          getResidents(),
          getBuildings(),
        ]);
        setResidents(residentsData);
        setBuildings(buildingsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addResident(newResident);
      setShowAddForm(false);
      setNewResident({
        email: '',
        name: '',
        unitNumber: '',
        buildingId: '',
        phoneNumber: '',
      });
      await loadData();
      alert('Resident added successfully!');
    } catch (error) {
      console.error('Error adding resident:', error);
      alert('Failed to add resident');
    }
  };

  const handleDeleteResident = async (residentId: string) => {
    if (!confirm('Are you sure you want to remove this resident?')) {
      return;
    }

    try {
      await deleteResident(residentId);
      await loadData();
      alert('Resident removed successfully');
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Failed to remove resident');
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
            <p className="text-gray-600 mb-8">This page is only accessible to administrators</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resident Management</h1>
            <p className="text-gray-600 mt-2">Manage approved residents who can access the portal</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
          >
            {showAddForm ? 'Cancel' : '+ Add Resident'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Resident</h2>
            <form onSubmit={handleAddResident} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newResident.email}
                  onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="resident@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newResident.name}
                  onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <select
                  value={newResident.buildingId}
                  onChange={(e) => setNewResident({ ...newResident, buildingId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select Building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
                <input
                  type="text"
                  value={newResident.unitNumber}
                  onChange={(e) => setNewResident({ ...newResident, unitNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newResident.phoneNumber}
                  onChange={(e) => setNewResident({ ...newResident, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="+357 99 123456"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
                >
                  Add Resident
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {residents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{resident.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{resident.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{resident.unitNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{resident.phoneNumber || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        resident.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {resident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteResident(resident.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {residents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No residents added yet</p>
            </div>
          )}
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
