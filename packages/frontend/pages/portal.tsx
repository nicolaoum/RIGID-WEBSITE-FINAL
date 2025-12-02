import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../lib/auth';
import { getTickets, getAllTickets, getNotices, postTicket, updateTicketStatus, checkResident, getResidents, addResident, deleteResident, getBuildings, User, Ticket, Notice, Resident, Building } from '../lib/api';

export default function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [isResident, setIsResident] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = getCurrentUser();
      console.log('Current user:', currentUser);
      console.log('User groups:', currentUser?.groups);
      
      setUser(currentUser);
      
      const userIsStaff = currentUser?.groups?.includes('staff') || currentUser?.groups?.includes('admin') || false;
      console.log('Is staff?', userIsStaff);
      setIsStaff(userIsStaff);

      // Check if user is an approved resident
      try {
        const residentCheck = await checkResident();
        console.log('Resident check:', residentCheck);
        
        if (residentCheck.isResident) {
          setIsResident(true);
          
          // Load notices for all users
          const noticesData = await getNotices();
          setNotices(noticesData);

          // Load tickets based on user role
          if (userIsStaff) {
            console.log('Loading all tickets for staff');
            const allTickets = await getAllTickets();
            setTickets(allTickets);
          } else {
            console.log('Loading user tickets for resident');
            const userTickets = await getTickets();
            setTickets(userTickets);
          }
        } else {
          console.log('User is not an approved resident');
          setAccessDenied(true);
        }
      } catch (error) {
        console.error('Error checking resident status:', error);
        setAccessDenied(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmit = async (ticket: Ticket) => {
    try {
      await postTicket(ticket);
      await loadUserData(); // Reload tickets
      alert('Maintenance request submitted successfully!');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit maintenance request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Portal Access</h2>
            <p className="text-gray-600 mb-8">Please log in to access the resident portal</p>
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

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              This portal is only accessible to approved residents of Rigid Residential.
            </p>
            <p className="text-gray-600 mb-8">
              If you believe this is an error, please contact management at{' '}
              <a href="mailto:info@rigidresidential.com" className="text-blue-600 hover:text-blue-800">
                info@rigidresidential.com
              </a>
            </p>
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
      
      {isStaff ? (
        <StaffPortal tickets={tickets} />
      ) : (
        <ResidentPortal user={user} tickets={tickets} notices={notices} onTicketSubmit={handleTicketSubmit} />
      )}
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

// Resident Portal Component
function ResidentPortal({
  user,
  tickets,
  notices,
  onTicketSubmit,
}: {
  user: User | null;
  tickets: Ticket[];
  notices: Notice[];
  onTicketSubmit: (ticket: Ticket) => Promise<void>;
}) {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    residentName: '',
    unitNumber: '',
    phoneNumber: '',
    allowEntry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onTicketSubmit({
      residentEmail: user?.email || '',
      ...ticketForm,
    });
    setTicketForm({ 
      subject: '', 
      description: '', 
      priority: 'medium',
      residentName: '',
      unitNumber: '',
      phoneNumber: '',
      allowEntry: false,
    });
  };

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Resident Portal</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Notices */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">📢 Notices</h3>
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 rounded-lg ${
                    notice.type === 'urgent'
                      ? 'bg-red-50 border border-red-200'
                      : notice.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 mb-1">{notice.title}</h4>
                  <p className="text-sm text-gray-700 mb-2">{notice.content}</p>
                  <p className="text-xs text-gray-500">{new Date(notice.publishedAt).toLocaleDateString()}</p>
                </div>
              ))}
              {notices.length === 0 && (
                <p className="text-gray-500 text-center py-8">No notices at this time</p>
              )}
            </div>
          </div>

          {/* Submit Maintenance Ticket */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">🔧 Submit Maintenance Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Detailed description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={ticketForm.residentName}
                  onChange={(e) => setTicketForm({ ...ticketForm, residentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
                <input
                  type="text"
                  required
                  value={ticketForm.unitNumber}
                  onChange={(e) => setTicketForm({ ...ticketForm, unitNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., 101, 202, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={ticketForm.phoneNumber}
                  onChange={(e) => setTicketForm({ ...ticketForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="+357 99 123456"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowEntry"
                  checked={ticketForm.allowEntry}
                  onChange={(e) => setTicketForm({ ...ticketForm, allowEntry: e.target.checked })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <label htmlFor="allowEntry" className="ml-2 text-sm font-medium text-gray-700">
                  Allow entry if I'm not home
                </label>
              </div>
              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* Your Tickets */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">📋 Your Maintenance Requests</h3>
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{ticket.subject}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ticket.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : ticket.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{ticket.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Priority: {ticket.priority}</span>
                  <span>{ticket.createdAt && new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <p className="text-gray-500 text-center py-8">No maintenance requests yet</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Staff Portal Component
function StaffPortal({ tickets }: { tickets: Ticket[] }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);
  const [showResidentTab, setShowResidentTab] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({
    email: '',
    name: '',
    unitNumber: '',
    buildingId: '',
    phoneNumber: '',
  });

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    if (showResidentTab) {
      loadResidents();
    }
  }, [showResidentTab]);

  const loadResidents = async () => {
    try {
      const [residentsData, buildingsData] = await Promise.all([
        getResidents(),
        getBuildings(),
      ]);
      setResidents(residentsData);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading residents:', error);
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
      await loadResidents();
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
      await loadResidents();
      alert('Resident removed successfully');
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Failed to remove resident');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: 'open' | 'in-progress' | 'resolved' | 'closed') => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      
      // Update local state
      setLocalTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId ? { ...t, status: newStatus } : t
        )
      );
      
      // Update selected ticket if it's open
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      
      alert(`Ticket status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      alert('Failed to update ticket status');
    }
  };

  // Filter tickets based on selected filter
  const filteredTickets = localTickets.filter(ticket => {
    if (filter === 'all') {
      // "All Tickets" shows only non-closed tickets
      return ticket.status !== 'closed' && ticket.status !== 'resolved';
    }
    return ticket.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'closed': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-gray-900 to-gray-800 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">👨‍💼 Staff Portal</h2>
          <p className="text-gray-300 text-lg">Manage all maintenance requests and residents</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowResidentTab(false)}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              !showResidentTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            🎫 Tickets
          </button>
          <button
            onClick={() => setShowResidentTab(true)}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              showResidentTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            👥 Residents
          </button>
        </div>

        {!showResidentTab ? (
          <div>
        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            All Tickets
            <span className="ml-2 bg-gray-900 text-white px-2 py-0.5 rounded-full text-xs">
              {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'open'
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            OPEN
            <span className="ml-2 bg-gray-900 text-white px-2 py-0.5 rounded-full text-xs">
              {tickets.filter(t => t.status === 'open').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'in-progress'
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            IN PROGRESS
            <span className="ml-2 bg-gray-900 text-white px-2 py-0.5 rounded-full text-xs">
              {tickets.filter(t => t.status === 'in-progress').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'closed'
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            CLOSED
            <span className="ml-2 bg-gray-900 text-white px-2 py-0.5 rounded-full text-xs">
              {tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length}
            </span>
          </button>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Resident</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono">#{ticket.id?.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{ticket.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ticket.residentName || ticket.residentEmail}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ticket.unitNumber || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status || 'open')}`}>
                        {ticket.status || 'open'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {ticket.createdAt && new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredTickets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No {filter !== 'all' ? filter : ''} tickets found</p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-yellow-100 rounded-lg p-6 border-2 border-yellow-300">
            <div className="text-3xl font-bold text-yellow-900">
              {tickets.filter(t => t.status === 'open').length}
            </div>
            <div className="text-yellow-700 font-semibold mt-1">Open Tickets</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-6 border-2 border-blue-300">
            <div className="text-3xl font-bold text-blue-900">
              {tickets.filter(t => t.status === 'in-progress').length}
            </div>
            <div className="text-blue-700 font-semibold mt-1">In Progress</div>
          </div>
          <div className="bg-green-100 rounded-lg p-6 border-2 border-green-300">
            <div className="text-3xl font-bold text-green-900">
              {tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length}
            </div>
            <div className="text-green-700 font-semibold mt-1">Closed</div>
          </div>
          <div className="bg-red-100 rounded-lg p-6 border-2 border-red-300">
            <div className="text-3xl font-bold text-red-900">
              {tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length}
            </div>
            <div className="text-red-700 font-semibold mt-1">High Priority</div>
          </div>
        </div>

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Ticket Details</h3>
                <button onClick={() => setSelectedTicket(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Ticket ID</label>
                  <p className="text-gray-900 font-mono">#{selectedTicket.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Subject</label>
                  <p className="text-gray-900 font-semibold text-lg">{selectedTicket.subject}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Description</label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedTicket.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Resident Email</label>
                    <p className="text-gray-900">{selectedTicket.residentEmail}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Priority</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                </div>
                
                {selectedTicket.residentName && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Resident Name</label>
                      <p className="text-gray-900">{selectedTicket.residentName}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Unit Number</label>
                      <p className="text-gray-900">{selectedTicket.unitNumber || 'N/A'}</p>
                    </div>
                  </div>
                )}
                
                {selectedTicket.phoneNumber && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
                      <p className="text-gray-900">
                        <a href={`tel:${selectedTicket.phoneNumber}`} className="text-blue-600 hover:text-blue-800">
                          {selectedTicket.phoneNumber}
                        </a>
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Entry Permission</label>
                      <p className="text-gray-900">
                        {selectedTicket.allowEntry ? (
                          <span className="text-green-600 font-semibold">✓ Entry allowed</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Resident must be home</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedTicket.status || 'open')}`}>
                      {selectedTicket.status || 'open'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Created</label>
                    <p className="text-gray-900">{selectedTicket.createdAt && new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Status Update Buttons */}
                <div className="pt-6 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-600 mb-3">Update Status</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.status !== 'open' && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id!, 'open')}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold"
                      >
                        Mark as Open
                      </button>
                    )}
                    {selectedTicket.status !== 'in-progress' && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id!, 'in-progress')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id!, 'resolved')}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-semibold"
                      >
                        Mark as Resolved
                      </button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id!, 'closed')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        ) : (
          /* Resident Management Section */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">Resident Management</h3>
                <p className="text-gray-300 mt-2">Manage approved residents who can access the portal</p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-100 transition font-semibold"
              >
                {showAddForm ? 'Cancel' : '+ Add Resident'}
              </button>
            </div>

            {showAddForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
                <h4 className="text-xl font-bold mb-4">Add New Resident</h4>
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

            <div className="bg-white rounded-xl shadow-lg overflow-hidden text-gray-900">
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
        )}
      </div>
    </section>
  );
}
