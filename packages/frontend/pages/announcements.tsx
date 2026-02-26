import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getCurrentUser, getAccessToken } from '../lib/auth';
import { sendAnnouncementEmail } from '../lib/api';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  publishedAt: string;
  buildingId?: string | null;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

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
  const [shareViaWhatsApp, setShareViaWhatsApp] = useState(false);
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  // Build a WhatsApp share URL with the announcement pre-filled
  const getWhatsAppShareUrl = (notice: Notice) => {
    const typeEmoji = notice.type === 'urgent' ? '🚨' : notice.type === 'warning' ? '⚠️' : 'ℹ️';
    const buildingName = notice.buildingId
      ? buildings.find(b => b.id === notice.buildingId)?.name || ''
      : 'All Buildings';
    const text = `${typeEmoji} *RIGID Residential — ${notice.title}*\n\n${notice.content}\n\n🏢 ${buildingName}\n📅 ${new Date(notice.publishedAt).toLocaleDateString()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

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
      const currentUser = getCurrentUser();
      setUser(currentUser);

      const userIsStaff = currentUser?.groups?.includes('admin') || currentUser?.groups?.includes('staff') || false;
      setIsStaff(userIsStaff);

      if (!userIsStaff) {
        setLoading(false);
        return;
      }

      const accessToken = getAccessToken();

      // Fetch notices and buildings
      const [noticesResponse, buildingsResponse] = await Promise.all([
        fetch('/api/proxy/notices', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }),
        fetch('/api/proxy/buildings', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }),
      ]);

      if (noticesResponse.ok) {
        const noticesData = await noticesResponse.json();
        setNotices(Array.isArray(noticesData) ? noticesData : []);
      }

      if (buildingsResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
      }
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
      const accessToken = getAccessToken();

      // Call the postNotice Lambda endpoint
      const response = await fetch('/api/proxy/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          buildingId: formData.buildingId || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post notice: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Add the returned notice to the local list
      if (result.notice) {
        setNotices([result.notice, ...notices]);
      }
      
      setMessage('✓ Announcement posted successfully!');

      // Open WhatsApp with the announcement pre-filled if checkbox was checked
      if (shareViaWhatsApp && result.notice) {
        window.open(getWhatsAppShareUrl(result.notice), '_blank');
      }

      // Send email to residents if checkbox was checked
      if (sendViaEmail) {
        try {
          setEmailStatus('📧 Sending emails to residents...');
          const emailResult = await sendAnnouncementEmail({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            buildingId: formData.buildingId || undefined,
          });
          setEmailStatus(`✓ Emails sent: ${emailResult.sent}/${emailResult.total}${emailResult.failed > 0 ? ` (${emailResult.failed} failed)` : ''}`);
          setTimeout(() => setEmailStatus(''), 5000);
        } catch (emailErr: any) {
          setEmailStatus(`⚠ Email sending failed: ${emailErr.message}`);
          setTimeout(() => setEmailStatus(''), 5000);
        }
      }

      setFormData({ title: '', content: '', type: 'info', buildingId: '' });
      setShareViaWhatsApp(false);
      setSendViaEmail(false);
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
      const accessToken = getAccessToken();
      const response = await fetch(`/api/proxy/notices/${noticeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete notice: ${response.status}`);
      }

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

        {/* Email Status */}
        {emailStatus && (
          <div className={`mb-4 p-4 rounded flex items-center gap-2 ${emailStatus.startsWith('✓') ? 'bg-blue-100 text-blue-700' : emailStatus.startsWith('⚠') ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-50 text-blue-600'}`}>
            {emailStatus}
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shareWhatsApp"
                    checked={shareViaWhatsApp}
                    onChange={(e) => setShareViaWhatsApp(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <label htmlFor="shareWhatsApp" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Also share via WhatsApp
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendViaEmail}
                    onChange={(e) => setSendViaEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Also send via Email to residents
                  </label>
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
                    <div className="flex flex-col gap-2 ml-4">
                      <a
                        href={getWhatsAppShareUrl(notice)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 whitespace-nowrap"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                      <button
                        onClick={() => handleDelete(notice.id)}
                        disabled={deleting === notice.id}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        {deleting === notice.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
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
