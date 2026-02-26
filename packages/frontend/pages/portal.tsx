import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, fetchCurrentUser, logout } from '../lib/auth';
import { getTickets, getAllTickets, getNotices, postTicket, updateTicketStatus, checkResident, getResidents, addResident, deleteResident, deleteTicket, getBuildings, getResidentInfo, syncPendingResidents, getInquiries, getUnits, generateInviteCode, getInviteCodes, User, Ticket, Notice, Resident, Building, Inquiry, Unit, InviteCode } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';

export default function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [isResident, setIsResident] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [residentInfo, setResidentInfo] = useState<Resident | null>(null);

  useEffect(() => {
    // Small delay to ensure localStorage is ready
    const timer = setTimeout(() => {
      loadUserData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadUserData = async () => {
    try {
      // Use fetchCurrentUser to get user from HttpOnly cookie via /api/me
      const currentUser = await fetchCurrentUser() || getCurrentUser();
      console.log('Current user:', currentUser);
      
      setUser(currentUser);
      
      const userIsStaff = currentUser?.groups?.includes('staff') || currentUser?.groups?.includes('admin') || false;
      console.log('Is staff?', userIsStaff);
      setIsStaff(userIsStaff);

      // Check if user is an approved resident and get their resident info
      try {
        const residentCheck = await checkResident();
        console.log('Resident check:', residentCheck);
        
        if (residentCheck.isResident) {
          setIsResident(true);
          
          // Get resident info (with unitNumber) directly from the Lambda response
          if (residentCheck.residentInfo) {
            console.log('Resident info from checkResident:', residentCheck.residentInfo);
            setResidentInfo(residentCheck.residentInfo);
          } else {
            // Fallback: try to get resident info separately
            try {
              const info = await getResidentInfo();
              if (info) {
                console.log('Resident info from getResidentInfo:', info);
                setResidentInfo(info);
              }
            } catch (error) {
              console.error('Error getting resident info:', error);
            }
          }
          
          // Load notices and filter by resident's building
          const noticesData = await getNotices();
          console.log('=== NOTICE FILTERING ===');
          console.log('All notices:', noticesData);
          
          // Get resident's building ID from checkResident response
          const residentBuildingId = residentCheck.residentInfo?.buildingId;
          console.log('Resident buildingId:', residentBuildingId);
          console.log('Is staff?', userIsStaff, 'residentCheck.isStaff?', residentCheck.isStaff);
          
          // Filter notices based on resident's building
          let filteredNotices: Notice[] = [];
          
          // Only skip filtering if user is staff AND NOT a resident with a building
          // This ensures residents who are also staff still get filtered notices
          const shouldFilterByBuilding = residentBuildingId && !userIsStaff;
          console.log('Should filter by building?', shouldFilterByBuilding);
          
          if (!shouldFilterByBuilding) {
            console.log('NOT filtering - showing all notices (staff user)');
            filteredNotices = noticesData;
          } else {
            // For residents, filter by their building
            for (const notice of noticesData) {
              const noticeBuildingId = notice.buildingId || '';
              
              // Always show notices that are for "All Buildings" (no buildingId or empty)
              if (!noticeBuildingId) {
                console.log(`✅ Showing "${notice.title}" - it's for all buildings`);
                filteredNotices.push(notice);
              }
              // Show notices that match the resident's building
              else if (noticeBuildingId === residentBuildingId) {
                console.log(`✅ Showing "${notice.title}" - notice building (${noticeBuildingId}) matches resident building (${residentBuildingId})`);
                filteredNotices.push(notice);
              }
              else {
                console.log(`❌ HIDING "${notice.title}" - notice is for ${noticeBuildingId}, resident is in ${residentBuildingId}`);
              }
            }
          }
          
          console.log('Filtered notices count:', filteredNotices.length);
          console.log('=== END FILTERING ===');
          
          setNotices(filteredNotices);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-24">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Portal Access</h2>
            <p className="text-slate-500 mb-8">Please log in to access the resident portal</p>
            <a href="/api/login" className="inline-flex items-center justify-center bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25">
              Log In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-24">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-500 mb-2">
              This portal is only accessible to approved residents of Rigid Residential.
            </p>
            <p className="text-slate-500 mb-8">
              If you believe this is an error, please contact management at{' '}
              <a href="mailto:info@rigidresidential.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                info@rigidresidential.com
              </a>
            </p>
            <Link href="/" className="inline-flex items-center justify-center bg-slate-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition-all duration-300">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isStaff ? 'bg-gray-50' : 'bg-white'}`}>
      <Navigation />
      
      {isStaff ? (
        <StaffPortal tickets={tickets} />
      ) : (
        <ResidentPortal user={user} tickets={tickets} notices={notices} onTicketSubmit={handleTicketSubmit} onLoadUserData={loadUserData} residentInfo={residentInfo} />
      )}
    </div>
  );
}

// Navigation Component
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-3xl font-extrabold tracking-tight text-slate-900">RIGID</Link>
          <div className="hidden md:flex items-center space-x-8">
            {['Home', 'Buildings', 'Portal', 'Contact'].map((item) => (
              <Link key={item} href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                className={`text-base font-medium tracking-wide transition-colors ${item === 'Portal' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm font-medium text-slate-600 hidden sm:inline">{user.email}</span>
                <button onClick={handleLogout} className="text-base font-semibold px-5 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all">Logout</button>
              </>
            ) : (
              <a href="/api/login" className="text-base font-semibold px-6 py-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all">Login</a>
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
  onLoadUserData,
  residentInfo,
}: {
  user: User | null;
  tickets: Ticket[];
  notices: Notice[];
  onTicketSubmit: (ticket: Ticket) => Promise<void>;
  onLoadUserData: () => Promise<void>;
  residentInfo: Resident | null;
}) {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    residentName: '',
    unitNumber: '',
    buildingId: '',
    buildingName: '',
    phoneNumber: '',
    allowEntry: false,
  });

  // Update unitNumber and building when residentInfo or user changes
  useEffect(() => {
    console.log('useEffect triggered - residentInfo:', residentInfo, 'user:', user);
    let unitNum: string | undefined;
    let buildingId: string | undefined;
    let buildingName: string | undefined;
    
    if (residentInfo?.unitNumber) {
      unitNum = residentInfo.unitNumber;
      buildingId = residentInfo.buildingId;
      buildingName = residentInfo.buildingName;
    } else if (
      // @ts-ignore
      user?.['custom:apartmentNumber']
    ) {
      // @ts-ignore
      unitNum = user['custom:apartmentNumber'];
    }
    
    if (unitNum) {
      setTicketForm(prev => ({ 
        ...prev, 
        unitNumber: unitNum || '',
        buildingId: buildingId || '',
        buildingName: buildingName || ''
      }));
    }
  }, [residentInfo, user]);

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
      buildingId: '',
      buildingName: '',
      phoneNumber: '',
      allowEntry: false,
    });
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none";

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    resolved: 'bg-emerald-100 text-emerald-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    open: 'bg-slate-100 text-slate-700',
  };

  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">Welcome Back</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">Resident Portal</h1>
          {residentInfo && (
            <p className="text-lg text-slate-500">
              {residentInfo.buildingName} &mdash; Unit {residentInfo.unitNumber}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

            {/* Notices */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Notices</h3>
              </div>
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div key={notice.id}
                    className={`p-4 rounded-xl border ${
                      notice.type === 'urgent'
                        ? 'bg-red-50 border-red-200'
                        : notice.type === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{notice.title}</h4>
                    <p className="text-sm text-slate-600 mb-2">{notice.content}</p>
                    <p className="text-xs text-slate-400">{new Date(notice.publishedAt).toLocaleDateString()}</p>
                  </div>
                ))}
                {notices.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm">No notices at this time</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Maintenance Ticket */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Maintenance Request</h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                  <input type="text" required value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    className={inputClass} placeholder="Brief description of the issue" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                  <select value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className={inputClass}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea required rows={3} value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    className={inputClass + ' resize-none'} placeholder="Detailed description of the issue" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name</label>
                    <input type="text" required value={ticketForm.residentName}
                      onChange={(e) => setTicketForm({ ...ticketForm, residentName: e.target.value })}
                      className={inputClass} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                    <input type="tel" required value={ticketForm.phoneNumber}
                      onChange={(e) => setTicketForm({ ...ticketForm, phoneNumber: e.target.value })}
                      className={inputClass} placeholder="+357 99 123456" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Building</label>
                    <input type="text" required value={ticketForm.buildingName || ''} readOnly
                      className={inputClass + ' bg-slate-100 cursor-not-allowed'} placeholder="Your building" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apartment</label>
                    <input type="text" required value={ticketForm.unitNumber || ''} readOnly
                      className={inputClass + ' bg-slate-100 cursor-not-allowed'} placeholder="Your apartment" />
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1">
                  <input type="checkbox" id="allowEntry" checked={ticketForm.allowEntry}
                    onChange={(e) => setTicketForm({ ...ticketForm, allowEntry: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500" />
                  <label htmlFor="allowEntry" className="text-sm font-medium text-slate-600">
                    Allow entry if I'm not home
                  </label>
                </div>
                <button type="submit"
                  className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25">
                  Submit Request
                </button>
              </form>
            </div>
          </div>

          {/* Your Tickets */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Your Maintenance Requests</h3>
            </div>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-slate-50 rounded-xl p-5 border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-900">{ticket.subject}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusColors[ticket.status || 'open'] || statusColors.open}`}>
                        {ticket.status}
                      </span>
                      <button onClick={async () => {
                          if (confirm('Are you sure you want to delete this ticket?')) {
                            try {
                              await deleteTicket(ticket.id || '');
                              await onLoadUserData();
                              alert('Ticket deleted successfully');
                            } catch (error) {
                              console.error('Error deleting ticket:', error);
                              alert('Failed to delete ticket');
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete ticket">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={`px-2.5 py-1 rounded-lg font-semibold ${priorityColors[ticket.priority || 'medium']}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-slate-400">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  <p className="text-slate-400 text-sm">No maintenance requests yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Staff Portal Component
function StaffPortal({ tickets }: { tickets: Ticket[] }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);
  const [showResidentTab, setShowResidentTab] = useState(false);
  const [showAnnouncementsTab, setShowAnnouncementsTab] = useState(false);
  const [showInquiriesTab, setShowInquiriesTab] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncingResidents, setSyncingResidents] = useState(false);
  const [newResident, setNewResident] = useState({
    email: '',
    name: '',
    unitNumber: '',
    buildingId: '',
    phoneNumber: '',
  });

  // Invite code state
  const [units, setUnits] = useState<Unit[]>([]);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteBuildingId, setInviteBuildingId] = useState('');
  const [inviteUnitId, setInviteUnitId] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; unitNumber: string; buildingName: string; expiresAt: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    if (showResidentTab) {
      loadResidents();
      // Auto-refresh every 1 minute
      const interval = setInterval(loadResidents, 60000);
      return () => clearInterval(interval);
    }
  }, [showResidentTab]);

  useEffect(() => {
    if (showInquiriesTab) {
      loadInquiries();
    }
  }, [showInquiriesTab]);

  const loadInquiries = async () => {
    try {
      const data = await getInquiries();
      setInquiries(data);
    } catch (error) {
      console.error('Error loading inquiries:', error);
    }
  };

  const loadResidents = async () => {
    try {
      const [residentsData, buildingsData, unitsData] = await Promise.all([
        getResidents(),
        getBuildings(),
        getUnits(),
      ]);
      console.log('Loaded residents:', residentsData);
      setResidents(residentsData);
      setBuildings(buildingsData);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading residents:', error);
    }
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Adding resident:', newResident);
      const result = await addResident(newResident);
      console.log('Add resident result:', result);
      setShowAddForm(false);
      setNewResident({
        email: '',
        name: '',
        unitNumber: '',
        buildingId: '',
        phoneNumber: '',
      });
      // Small delay to ensure DynamoDB has propagated the change
      await new Promise(resolve => setTimeout(resolve, 500));
      // Force reload residents list
      const [residentsData, buildingsData] = await Promise.all([
        getResidents(),
        getBuildings(),
      ]);
      console.log('Refreshed residents after add:', residentsData);
      setResidents(residentsData);
      setBuildings(buildingsData);
      alert('Resident added successfully!');
    } catch (error) {
      console.error('Error adding resident:', error);
      alert('Failed to add resident: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSyncPendingResidents = async () => {
    if (syncingResidents) return;
    
    setSyncingResidents(true);
    try {
      const result = await syncPendingResidents();
      console.log('Sync result:', result);
      
      // Refresh the residents list
      const residentsData = await getResidents();
      setResidents(residentsData);
      
      alert(`Sync complete!\n\nChecked: ${result.results.checked}\nActivated: ${result.results.activated}\nStill Pending: ${result.results.stillPending}\nErrors: ${result.results.errors}`);
    } catch (error) {
      console.error('Error syncing residents:', error);
      alert('Failed to sync residents: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncingResidents(false);
    }
  };

  const handleDeleteResident = async (residentId: string) => {
    if (!confirm('Are you sure you want to remove this resident?')) {
      return;
    }

    try {
      // Find the resident to get their cognitoUsername
      const resident = residents.find(r => r.id === residentId);
      console.log('Deleting resident:', residentId, 'cognitoUsername:', resident?.cognitoUsername);
      const result = await deleteResident(residentId, resident?.cognitoUsername);
      console.log('Delete result:', result);
      // Small delay to ensure DynamoDB has propagated the change
      await new Promise(resolve => setTimeout(resolve, 500));
      // Force reload residents list
      const [residentsData, buildingsData] = await Promise.all([
        getResidents(),
        getBuildings(),
      ]);
      console.log('Refreshed residents after delete:', residentsData);
      setResidents(residentsData);
      setBuildings(buildingsData);
      alert('Resident removed successfully');
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Failed to remove resident: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleGenerateInviteCode = async () => {
    if (!inviteUnitId) {
      alert('Please select a unit first');
      return;
    }
    setGeneratingCode(true);
    try {
      const result = await generateInviteCode(inviteUnitId);
      setGeneratedCode(result);
      setShowCodeModal(true);
    } catch (error) {
      console.error('Error generating invite code:', error);
      alert('Failed to generate invite code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const shareInviteViaWhatsApp = (code: string, unitNumber: string, buildingName: string) => {
    const joinUrl = `${window.location.origin}/join?code=${code}`;
    const message = `🏠 You've been invited to join RIGID Residential!\n\n📍 Building: ${buildingName}\n🚪 Unit: ${unitNumber}\n🔑 Invite Code: ${code}\n\n👉 Register here: ${joinUrl}\n\nClick the link — your code will be pre-filled!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredUnitsForInvite = units.filter(u => u.buildingId === inviteBuildingId);

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
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => { setShowResidentTab(false); setShowAnnouncementsTab(false); setShowInquiriesTab(false); }}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              !showResidentTab && !showAnnouncementsTab && !showInquiriesTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            🎫 Tickets
          </button>
          <button
            onClick={() => { setShowResidentTab(true); setShowAnnouncementsTab(false); setShowInquiriesTab(false); }}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              showResidentTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            👥 Residents
          </button>
          <button
            onClick={() => { setShowAnnouncementsTab(true); setShowResidentTab(false); setShowInquiriesTab(false); }}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              showAnnouncementsTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            📢 Announcements
          </button>
          <button
            onClick={() => { setShowInquiriesTab(true); setShowResidentTab(false); setShowAnnouncementsTab(false); }}
            className={`px-8 py-3 rounded-lg font-semibold transition ${
              showInquiriesTab
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            📩 Inquiries
            {inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {showInquiriesTab ? (
          /* Inquiries Section */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Contact Form Inquiries</h3>
              <button
                onClick={loadInquiries}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold text-sm"
              >
                ↻ Refresh
              </button>
            </div>
            {inquiries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-xl mb-2">No inquiries yet</p>
                <p className="text-sm">Inquiries submitted through the contact form will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className={`bg-gray-800 rounded-xl p-6 border ${inquiry.status === 'new' ? 'border-yellow-500/50' : inquiry.status === 'done' ? 'border-green-500/50' : inquiry.status === 'pending' ? 'border-orange-500/50' : 'border-gray-700'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg">{inquiry.subject || 'No Subject'}</h4>
                        <p className="text-gray-400 text-sm">
                          From <span className="text-white font-medium">{inquiry.name}</span> — <a href={`mailto:${inquiry.email}`} className="text-blue-400 hover:text-blue-300">{inquiry.email}</a>
                          {inquiry.phone && <span className="ml-2">· {inquiry.phone}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          inquiry.status === 'new' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          inquiry.status === 'done' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          inquiry.status === 'pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-gray-600/50 text-gray-300 border border-gray-500/30'
                        }`}>
                          {inquiry.status || 'new'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/50 rounded-lg p-4">{inquiry.message}</p>
                    <div className="mt-3 flex gap-2">
                      <a href={`mailto:${inquiry.email}?subject=Re: ${inquiry.subject || 'Your inquiry'}`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition font-semibold">
                        ↗ Reply via Email
                      </a>
                      {inquiry.status !== 'done' && (
                        <button
                          onClick={async () => {
                            try {
                              const { updateInquiryStatus } = await import('../lib/api');
                              await updateInquiryStatus(inquiry.id!, 'done');
                              loadInquiries();
                            } catch (e) { console.error(e); }
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition font-semibold"
                        >
                          ✓ Done
                        </button>
                      )}
                      {inquiry.status !== 'pending' && (
                        <button
                          onClick={async () => {
                            try {
                              const { updateInquiryStatus } = await import('../lib/api');
                              await updateInquiryStatus(inquiry.id!, 'pending');
                              loadInquiries();
                            } catch (e) { console.error(e); }
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-500 transition font-semibold"
                        >
                          ⏳ Pending
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : showAnnouncementsTab ? (
          /* Announcements Section */
          <div className="text-center py-8">
            <Link 
              href="/announcements"
              className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition font-semibold text-lg"
            >
              Open Announcements Manager
            </Link>
          </div>
        ) : !showResidentTab ? (
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
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Building</label>
                      <p className="text-gray-900">{selectedTicket.buildingName || 'N/A'}</p>
                    </div>
                  </div>
                )}
                
                {selectedTicket.unitNumber && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">Unit Number</label>
                      <p className="text-gray-900">{selectedTicket.unitNumber}</p>
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
              <div className="flex gap-3">
                <button
                  onClick={handleSyncPendingResidents}
                  disabled={syncingResidents}
                  className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Check if pending residents have completed signup and activate them"
                >
                  {syncingResidents ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>🔄 Sync Pending</>
                  )}
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-100 transition font-semibold"
                >
                  {showAddForm ? 'Cancel' : '+ Add Resident'}
                </button>
                <button
                  onClick={() => { setShowInviteSection(!showInviteSection); if (showInviteSection) { setInviteBuildingId(''); setInviteUnitId(''); } }}
                  className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg hover:bg-yellow-400 transition font-semibold flex items-center gap-2"
                >
                  {showInviteSection ? '✕ Close' : '🔑 Invite Code'}
                </button>
              </div>
            </div>

            {showAddForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
                <h4 className="text-xl font-bold mb-4">Add New Resident</h4>
                <form onSubmit={handleAddResident} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newResident.name}
                      onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newResident.email}
                      onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="resident@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                    <input
                      type="text"
                      required
                      value={newResident.unitNumber}
                      onChange={(e) => setNewResident({ ...newResident, unitNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="e.g., 101, 2A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newResident.phoneNumber}
                      onChange={(e) => setNewResident({ ...newResident, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="+357 99 123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                    <select
                      required
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

                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
                  >
                    Add Resident
                  </button>
                </form>
              </div>
            )}

            {/* Generate Invite Code Section */}
            {showInviteSection && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 text-gray-900 border border-yellow-200">
                <h4 className="text-xl font-bold mb-1 flex items-center gap-2">🔑 Generate Invite Code</h4>
                <p className="text-gray-500 text-sm mb-4">Select a building and unit, then generate a one-time invite code for a new tenant to self-register.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                    <select
                      value={inviteBuildingId}
                      onChange={(e) => { setInviteBuildingId(e.target.value); setInviteUnitId(''); }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                    <select
                      value={inviteUnitId}
                      onChange={(e) => setInviteUnitId(e.target.value)}
                      disabled={!inviteBuildingId}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">{inviteBuildingId ? 'Select Unit' : 'Select a building first'}</option>
                      {filteredUnitsForInvite.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber} — {unit.bedrooms}BR / {unit.bathrooms}BA {unit.available ? '(Available)' : '(Occupied)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateInviteCode}
                  disabled={!inviteUnitId || generatingCode}
                  className="w-full bg-yellow-500 text-gray-900 py-3 rounded-lg hover:bg-yellow-400 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingCode ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>🔑 Generate Invite Code</>
                  )}
                </button>
              </div>
            )}

            {/* Invite Code Modal */}
            {showCodeModal && generatedCode && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCodeModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="text-5xl mb-4">🔑</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Invite Code Generated!</h3>
                  <p className="text-gray-500 mb-1">
                    {generatedCode.buildingName} — Unit {generatedCode.unitNumber}
                  </p>
                  <p className="text-gray-400 text-sm mb-6">
                    Expires: {new Date(generatedCode.expiresAt).toLocaleDateString()}
                  </p>

                  <div className="bg-gray-100 rounded-xl p-4 mb-4">
                    <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                      {generatedCode.code}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 inline-block">
                    <QRCodeSVG
                      value={`https://rigidrent.com/join?code=${generatedCode.code}`}
                      size={180}
                      level="M"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#111827"
                    />
                    <p className="text-xs text-gray-400 mt-2">Scan to register</p>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => copyInviteCode(generatedCode.code)}
                      className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                        copiedCode
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {copiedCode ? '✅ Copied!' : '📋 Copy Code'}
                    </button>
                    <button
                      onClick={() => shareInviteViaWhatsApp(generatedCode.code, generatedCode.unitNumber, generatedCode.buildingName)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      📱 WhatsApp
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Show this QR code to the tenant, or share the code. They can register at <strong>{typeof window !== 'undefined' ? window.location.origin : ''}/join</strong>
                  </p>

                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden text-gray-900">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Building:</label>
                <select
                  value={selectedBuildingFilter}
                  onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="all">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Building</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {residents
                      .filter((resident) => selectedBuildingFilter === 'all' || resident.buildingId === selectedBuildingFilter)
                      .map((resident) => (
                      <tr key={resident.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{resident.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{resident.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{resident.phoneNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {buildings.find(b => b.id === resident.buildingId)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{resident.unitNumber || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            resident.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : resident.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
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
