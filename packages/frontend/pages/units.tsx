import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Unit, getUnits, updateUnit, User } from '../lib/api';
import { generateInviteCode, getInviteCodes, InviteCode } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { getCurrentUser, fetchCurrentUser, logout } from '../lib/auth';

export default function UnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [newUnit, setNewUnit] = useState({
    buildingId: '',
    buildingName: '',
    unitNumber: '',
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    price: 1000,
    availableDate: '',
    videoUrl: '',
  });

  // Invite code state
  const [inviteCodes, setInviteCodes] = useState<Record<string, InviteCode>>({});
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<{code: string; unitNumber: string; buildingName: string} | null>(null);
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{src: string; alt: string} | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const buildingFilter = router.query.building as string;
  const isStaff = user && (user.groups?.includes('staff') || user.groups?.includes('admin'));

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const fetchData = async () => {
      const [unitsData, userData] = await Promise.all([
        getUnits(),
        fetchCurrentUser(),
      ]);
      setUnits(unitsData);
      setUser(userData);

      // Load existing invite codes for staff
      if (userData && (userData.groups?.includes('staff') || userData.groups?.includes('admin'))) {
        try {
          const { codes } = await getInviteCodes();
          const codeMap: Record<string, InviteCode> = {};
          for (const c of codes) {
            // Keep only the latest unused code per unit
            if (c.status === 'unused' && (!codeMap[c.unitId] || c.createdAt > codeMap[c.unitId].createdAt)) {
              codeMap[c.unitId] = c;
            }
          }
          setInviteCodes(codeMap);
        } catch (err) {
          console.error('Error loading invite codes:', err);
        }
      }
    };
    fetchData();
  }, []);

  const handleGenerateCode = async (unitId: string) => {
    setGeneratingCode(unitId);
    try {
      const result = await generateInviteCode(unitId);
      // Update local state with the new code
      setInviteCodes(prev => ({
        ...prev,
        [unitId]: {
          code: result.code,
          unitId,
          unitNumber: result.unitNumber,
          buildingName: result.buildingName,
          status: 'unused' as const,
          createdBy: user?.email || '',
          createdAt: new Date().toISOString(),
          expiresAt: result.expiresAt,
        },
      }));
      setShowCodeModal({
        code: result.code,
        unitNumber: result.unitNumber,
        buildingName: result.buildingName,
      });
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      alert('Failed to generate invite code');
    } finally {
      setGeneratingCode(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredUnits = buildingFilter
    ? units.filter(u => u.buildingId === buildingFilter && ((isStaff && showAllUnits) || u.available))
    : units.filter(u => (isStaff && showAllUnits) || u.available);

  const availableCount = units.filter(u => u.available).length;
  const totalCount = units.length;

  // Determine a safe content type for image uploads (mobile can send empty or HEIC types)
  const getImageContentType = (file: File): string => {
    if (file.type && file.type !== 'image/heic' && file.type !== 'image/heif') {
      return file.type;
    }
    // Fallback based on extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', heic: 'image/jpeg', heif: 'image/jpeg',
    };
    return extMap[ext || ''] || 'image/jpeg';
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const imageUrls: string[] = [];
      console.log('Uploading', imageFiles.length, 'images...');
      
      for (const file of imageFiles) {
        const contentType = getImageContentType(file);
        console.log('Processing file:', file.name, 'original type:', file.type, 'using:', contentType);
        
        // Use proxy — auth token is read from HttpOnly cookie server-side
        const urlResponse = await fetch('/api/proxy/upload-url', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            fileName: file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
            contentType,
          }),
        });
        
        if (!urlResponse.ok) {
          const error = await urlResponse.text();
          console.error('Failed to get upload URL:', error);
          throw new Error('Failed to get upload URL');
        }
        
        const { uploadUrl, fileUrl } = await urlResponse.json();
        console.log('Got presigned URL, uploading to S3...');
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file,
        });
        
        if (!uploadResponse.ok) {
          console.error('S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
          throw new Error('Failed to upload image to S3');
        }
        
        console.log('Image uploaded successfully:', fileUrl);
        imageUrls.push(fileUrl);
      }

      console.log('All images uploaded. Creating unit with data:', {
        ...newUnit,
        imageUrls,
      });

      const response = await fetch('/api/proxy/units', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...newUnit,
          available: true,
          imageUrl: imageUrls[0] || null,
          images: imageUrls,
          videoUrl: newUnit.videoUrl || null,
        }),
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewUnit({
          buildingId: '',
          buildingName: '',
          unitNumber: '',
          bedrooms: 2,
          bathrooms: 1,
          sqft: 900,
          price: 1000,
          availableDate: '',
          videoUrl: '',
        });
        setImageFiles([]);
        const updatedUnits = await getUnits();
        setUnits(updatedUnits);
        alert('Unit added successfully!');
      } else {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error || errData?.message || response.statusText;
        console.error('Unit creation failed:', response.status, errMsg);
        alert(`Failed to add unit: ${errMsg}`);
      }
    } catch (error) {
      console.error('Failed to add unit:', error);
      alert('Failed to add unit');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const response = await fetch(`/api/proxy/units/${unitId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.ok) {
        const updatedUnits = await getUnits();
        setUnits(updatedUnits);
        alert('Unit deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete unit:', error);
      alert('Failed to delete unit');
    }
  };

  const handleToggleAvailability = async (unit: Unit) => {
    const newStatus = !unit.available;
    const action = newStatus ? 'put back on the market' : 'take off the market';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} Unit ${unit.unitNumber}?`)) return;

    try {
      await updateUnit(unit.id, { available: newStatus });
      // Update local state immediately
      setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, available: newStatus } : u));
    } catch (error) {
      console.error('Failed to toggle unit availability:', error);
      alert('Failed to update unit');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900">
              Rigid Residential
            </Link>
            <div className="hidden sm:flex gap-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/buildings" className="text-gray-600 hover:text-gray-900">Buildings</Link>
              <Link href="/portal" className="text-gray-600 hover:text-gray-900">Resident Portal</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-gray-900 font-semibold text-sm sm:text-base"
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
          {/* Mobile nav links */}
          <div className="flex sm:hidden gap-4 mt-3 overflow-x-auto text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Home</Link>
            <Link href="/buildings" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Buildings</Link>
            <Link href="/portal" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Portal</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Units Section */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
                {isStaff && showAllUnits ? 'All Units' : 'Available Units'}
              </h1>
              {buildingFilter && (
                <Link href="/units" className="text-sm text-blue-600 hover:text-blue-800">
                  ← View all units
                </Link>
              )}
            </div>
            {isStaff && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                {showAddForm ? 'Cancel' : '+ Add New Unit'}
              </button>
            )}
          </div>

          {/* Staff-only toggle bar */}
          {isStaff && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">
                  Showing <strong className="text-gray-900">{filteredUnits.length}</strong> of <strong className="text-gray-900">{totalCount}</strong> units
                  {!showAllUnits && <span className="text-emerald-600"> ({availableCount} available)</span>}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Available only</span>
                <button
                  onClick={() => setShowAllUnits(!showAllUnits)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    showAllUnits ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                      showAllUnits ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500">Show all</span>
              </div>
            </div>
          )}

          {/* Add Unit Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Add New Unit</h3>
              <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                  <select
                    required
                    value={newUnit.buildingId}
                    onChange={(e) => {
                      const selected = e.target.selectedOptions[0];
                      setNewUnit({
                        ...newUnit,
                        buildingId: e.target.value,
                        buildingName: selected.text,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select Building</option>
                    <option value="bldg-001">RIGID 1 Pierias</option>
                    <option value="bldg-002">RIGID 2 Stadiou</option>
                    <option value="bldg-003">RIGID 3 Ektoros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    value={newUnit.unitNumber}
                    onChange={(e) => setNewUnit({ ...newUnit, unitNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g., 305"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="5"
                    value={newUnit.bedrooms}
                    onChange={(e) => setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="3"
                    step="0.5"
                    value={newUnit.bathrooms}
                    onChange={(e) => setNewUnit({ ...newUnit, bathrooms: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newUnit.sqft}
                    onChange={(e) => setNewUnit({ ...newUnit, sqft: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent (€/month)</label>
                  <input
                    type="number"
                    required
                    min="500"
                    value={newUnit.price}
                    onChange={(e) => setNewUnit({ ...newUnit, price: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
                  <input
                    type="date"
                    required
                    value={newUnit.availableDate}
                    onChange={(e) => setNewUnit({ ...newUnit, availableDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                  />
                  {imageFiles.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{imageFiles.length} file(s) selected</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video URL (optional)</label>
                  <input
                    type="url"
                    value={newUnit.videoUrl}
                    onChange={(e) => setNewUnit({ ...newUnit, videoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Add Unit
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Units Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredUnits.map((unit) => (
              <div key={unit.id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition relative ${!unit.available && isStaff ? 'ring-2 ring-orange-300' : ''}`}>
                {/* Occupied badge for staff */}
                {isStaff && !unit.available && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow">Occupied</span>
                  </div>
                )}
                {isStaff && (
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                      onClick={() => handleGenerateCode(unit.id)}
                      disabled={generatingCode === unit.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition font-semibold text-sm disabled:opacity-50"
                      title="Generate invite code for this unit"
                    >
                      {generatingCode === unit.id ? '...' : '🔑 Code'}
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition font-semibold text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center cursor-pointer" onClick={() => { setGalleryIndex(0); setSelectedUnit(unit); }}>
                  {unit.imageUrl ? (
                    <img src={unit.imageUrl} alt={`Unit ${unit.unitNumber}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-500 text-lg">🏠</span>
                  )}
                  {(unit.images && unit.images.length > 1) && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                      +{unit.images.length - 1} more
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {unit.buildingName} - Unit {unit.unitNumber}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-700">
                      {unit.bedrooms} BD | {unit.bathrooms} BA | {unit.sqft} sqft
                    </p>
                    <p className="text-2xl font-bold text-gray-900">€{unit.rent?.toLocaleString()}/mo</p>
                    {unit.availableDate && (
                      <p className="text-sm text-gray-600">Available: {unit.availableDate}</p>
                    )}
                    {isStaff && inviteCodes[unit.id] && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                          🔑 {inviteCodes[unit.id].code}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyCode(inviteCodes[unit.id].code); }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          {copiedCode === inviteCodes[unit.id].code ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {isStaff && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleAvailability(unit); }}
                        className={`block w-full text-center py-2 rounded-lg transition font-semibold text-sm ${
                          unit.available
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                        }`}
                      >
                        {unit.available ? '👁️‍🗨️ Take Off Market' : '🏷️ Put Back on Market'}
                      </button>
                    )}
                    {unit.videoUrl && (
                      <button
                        onClick={() => { setGalleryIndex(0); setSelectedUnit(unit); }}
                        className="block w-full bg-red-600 text-white text-center py-2 rounded-lg hover:bg-red-700 transition mb-2"
                      >
                        📹 Watch Video Tour
                      </button>
                    )}
                    <button
                      onClick={() => { setGalleryIndex(0); setSelectedUnit(unit); }}
                      className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition mb-2"
                    >
                      View Details
                    </button>
                    <Link
                      href="/contact"
                      className="block w-full bg-gray-900 text-white text-center py-2 rounded-lg hover:bg-gray-800 transition"
                    >
                      Inquire Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Unit Details Modal */}
          {selectedUnit && (() => {
            const allImages = selectedUnit.images && selectedUnit.images.length > 0
              ? selectedUnit.images
              : selectedUnit.imageUrl ? [selectedUnit.imageUrl] : [];
            return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedUnit(null)}>
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              
              {/* Modal */}
              <div 
                className="relative bg-white w-full sm:max-w-2xl lg:max-w-4xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Hero Image Gallery */}
                {allImages.length > 0 && (
                  <div className="relative w-full h-56 sm:h-72 lg:h-80 bg-gray-900 flex-shrink-0">
                    <img
                      src={allImages[galleryIndex] || allImages[0]}
                      alt={`Unit ${selectedUnit.unitNumber} - Photo ${galleryIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setZoomedImage({ src: allImages[galleryIndex], alt: `Unit ${selectedUnit.unitNumber}` })}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Gradient overlay for text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                    
                    {/* Close button */}
                    <button 
                      onClick={() => setSelectedUnit(null)} 
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-lg"
                    >
                      ✕
                    </button>
                    
                    {/* Gallery nav arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setGalleryIndex((galleryIndex - 1 + allImages.length) % allImages.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition text-xl"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setGalleryIndex((galleryIndex + 1) % allImages.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition text-xl"
                        >
                          ›
                        </button>
                      </>
                    )}
                    
                    {/* Title overlay on image */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-white text-xl sm:text-2xl font-bold drop-shadow-lg">
                        {selectedUnit.buildingName}
                      </h3>
                      <p className="text-white/90 text-sm sm:text-base drop-shadow">
                        Unit {selectedUnit.unitNumber}
                      </p>
                    </div>
                    
                    {/* Dot indicators */}
                    {allImages.length > 1 && (
                      <div className="absolute bottom-3 right-4 flex gap-1.5">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setGalleryIndex(idx)}
                            className={`w-2 h-2 rounded-full transition ${idx === galleryIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Tap to zoom hint */}
                    <div className="absolute top-3 left-3 bg-black/40 text-white/80 text-xs px-2.5 py-1 rounded-full">
                      📷 {galleryIndex + 1}/{allImages.length} · Tap to zoom
                    </div>
                  </div>
                )}

                {/* Thumbnail strip */}
                {allImages.length > 1 && (
                  <div className="flex gap-1.5 px-4 py-2.5 bg-gray-50 overflow-x-auto flex-shrink-0 border-b">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryIndex(idx)}
                        className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition ${
                          idx === galleryIndex ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-1">
                  {/* Price banner */}
                  <div className="px-5 py-4 bg-gradient-to-r from-gray-900 to-gray-800">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-3xl sm:text-4xl font-bold text-white">€{selectedUnit.rent?.toLocaleString()}</span>
                        <span className="text-white/70 text-sm ml-1">/month</span>
                      </div>
                      {selectedUnit.available ? (
                        <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Available</span>
                      ) : (
                        <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Occupied</span>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-4 divide-x divide-gray-200 border-b bg-white">
                    <div className="py-4 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedUnit.bedrooms}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Beds</p>
                    </div>
                    <div className="py-4 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedUnit.bathrooms}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Baths</p>
                    </div>
                    <div className="py-4 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedUnit.sqft}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Sq Ft</p>
                    </div>
                    <div className="py-4 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        {selectedUnit.availableDate 
                          ? new Date(selectedUnit.availableDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Available</p>
                    </div>
                  </div>

                  {/* Video Tour */}
                  {selectedUnit.videoUrl && (
                    <div className="px-5 py-5 border-b">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-red-500">▶</span> Video Tour
                      </h4>
                      <div className="aspect-video rounded-xl overflow-hidden shadow-sm">
                        <iframe
                          className="w-full h-full"
                          src={selectedUnit.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          title="Unit Video Tour"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-5 py-5">
                    <div className="flex gap-3">
                      <Link
                        href="/contact"
                        onClick={() => setSelectedUnit(null)}
                        className="flex-1 bg-blue-600 text-white text-center py-3.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm sm:text-base shadow-sm"
                      >
                        ✉️ Inquire About This Unit
                      </Link>
                      <button 
                        onClick={() => setSelectedUnit(null)}
                        className="px-5 bg-gray-100 text-gray-600 py-3.5 rounded-xl hover:bg-gray-200 transition font-medium text-sm sm:text-base"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Zoomed Image Lightbox */}
          {zoomedImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 cursor-zoom-out"
              onClick={() => setZoomedImage(null)}
            >
              <button 
                onClick={() => setZoomedImage(null)} 
                className="absolute top-4 right-4 text-white text-4xl font-light hover:text-gray-300 z-[61]"
              >
                ×
              </button>
              <img 
                src={zoomedImage.src} 
                alt={zoomedImage.alt} 
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Invite Code Modal */}
          {showCodeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCodeModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔑</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Invite Code Generated!</h3>
                  <p className="text-gray-600 mb-1">
                    {showCodeModal.buildingName} — Unit {showCodeModal.unitNumber}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">Valid for 7 days • One-time use</p>

                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-4">
                    <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider">
                      {showCodeModal.code}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 inline-block">
                    <QRCodeSVG
                      value={`https://rigidrent.com/join?code=${showCodeModal.code}`}
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
                      onClick={() => copyCode(showCodeModal.code)}
                      className="flex-1 bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition font-semibold"
                    >
                      {copiedCode === showCodeModal.code ? '✓ Copied!' : '📋 Copy Code'}
                    </button>
                    <button
                      onClick={() => {
                        const text = `Welcome to ${showCodeModal.buildingName}! 🏠\n\nYour invite code: *${showCodeModal.code}*\n\nGo to https://rigidrent.com/join?code=${showCodeModal.code} to set up your account.\n\nOr scan the QR code to register directly!`;
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition font-semibold"
                    >
                      📱 WhatsApp
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCodeModal(null)}
                    className="text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Close
                  </button>

                  <p className="text-xs text-gray-400 mt-4">
                    Send or show this QR code to your new tenant. They can scan it or go to rigidrent.com/join
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
