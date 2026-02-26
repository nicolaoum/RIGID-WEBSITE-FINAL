import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchCurrentUser, isAuthenticated } from '../lib/auth';
import { getNotices, getBuildings as fetchBuildings, postNotice, deleteNotice, Notice, Building } from '../lib/api';

export default function Announcements() {
  const [user, setUser] = useState<any>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'urgent',
    buildingId: '',
  });
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filtered notices based on selected building
  const filteredNotices = useMemo(() => {
    console.log('Filter Debug:', { 
      filterBuildingId, 
      noticeCount: notices.length,
      notices: notices.map(n => ({ id: n.id, title: n.title, buildingId: n.buildingId }))
    });
    if (!filterBuildingId) return notices;
    const filtered = notices.filter((notice) => {
      const noticeBuildingId = notice.buildingId || '';
      const matches = noticeBuildingId === filterBuildingId;
      console.log(`Notice ${notice.title}: buildingId=${noticeBuildingId}, filter=${filterBuildingId}, matches=${matches}`);
      // Show ONLY notices for selected building (strict filter)
      return matches;
    });
    console.log('Filtered result:', filtered.length);
    return filtered;
  }, [notices, filterBuildingId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      const userIsStaff = currentUser?.groups?.includes('admin') || currentUser?.groups?.includes('staff') || false;
      setIsStaff(userIsStaff);

      if (!userIsStaff) {
        setLoading(false);
        return;
      }

      // Fetch notices and buildings via secure api.ts helpers (proxy handles auth)
      const [noticesData, buildingsData] = await Promise.all([
        getNotices(),
        fetchBuildings(),
      ]);

      setNotices(Array.isArray(noticesData) ? noticesData : []);
      setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      // Use secure api.ts helper — proxy handles auth via HttpOnly cookie
      const result = await postNotice({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        buildingId: formData.buildingId || undefined,
      });
      
      // Add the returned notice to the local list
      if (result.notice) {
        setNotices([result.notice, ...notices]);
      }
      
      setMessage('✓ Announcement posted successfully!');
      setFormData({ title: '', content: '', type: 'info', buildingId: '' });
      setShowForm(false);

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error posting announcement:', error);
      setMessage(`✗ Error: ${error.message || 'Failed to post announcement'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    setDeleting(noticeId);
    try {
      // Use secure api.ts helper — proxy handles auth via HttpOnly cookie
      await deleteNotice(noticeId);

      // Remove from local state
      setNotices(notices.filter(n => n.id !== noticeId));
      setMessage('✓ Announcement deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      setMessage(`✗ Error: ${error.message || 'Failed to delete announcement'}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Access Denied</div>
          <p className="text-gray-600 mb-4">You don't have permission to view this page.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcements Manager</h1>
            <p className="text-gray-600 mt-1">Welcome, {user?.username || 'Staff'}</p>
          </div>
          <Link href="/portal" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Portal
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded ${message.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Create Form */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {showForm ? 'Create New Announcement' : 'Create Announcement'}
            </h2>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                + New Announcement
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Announcement content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'info' | 'warning' | 'urgent' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Building (Optional)</label>
                    <select
                      value={formData.buildingId}
                      onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Buildings</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {submitting ? 'Posting...' : 'Post Announcement'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Announcements List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Recent Announcements</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Building:</label>
                <select
                  value={filterBuildingId}
                  onChange={(e) => setFilterBuildingId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="divide-y">
            {filteredNotices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {filterBuildingId ? 'No announcements for this building.' : 'No announcements yet. Create one to get started!'}
              </div>
            ) : (
              filteredNotices.map((notice) => (
                <div key={notice.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                        <span className={`px-2 py-1 text-sm rounded font-medium ${
                          notice.type === 'urgent' ? 'bg-red-100 text-red-700' :
                          notice.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notice.type.charAt(0).toUpperCase() + notice.type.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{notice.content}</p>
                      <div className="text-sm text-gray-500">
                        Posted: {new Date(notice.publishedAt).toLocaleString()}
                        {notice.buildingId ? ` • Building: ${buildings.find(b => b.id === notice.buildingId)?.name || notice.buildingId}` : ' • All Buildings'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      disabled={deleting === notice.id}
                      className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      {deleting === notice.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
