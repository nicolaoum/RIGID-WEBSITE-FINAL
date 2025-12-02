import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Unit, getUnits, User } from '../lib/api';
import { getCurrentUser } from '../lib/auth';

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

  const buildingFilter = router.query.building as string;
  const isStaff = user && (user.groups?.includes('staff') || user.groups?.includes('admin'));

  useEffect(() => {
    const fetchData = async () => {
      const [unitsData, userData] = await Promise.all([
        getUnits(),
        getCurrentUser(),
      ]);
      setUnits(unitsData);
      setUser(userData);
    };
    fetchData();
  }, []);

  const filteredUnits = buildingFilter
    ? units.filter(u => u.buildingId === buildingFilter && u.available)
    : units.filter(u => u.available);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('rigid_id_token');
      
      const imageUrls: string[] = [];
      console.log('Uploading', imageFiles.length, 'images...');
      
      for (const file of imageFiles) {
        console.log('Processing file:', file.name, file.type);
        
        const urlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload-url`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
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
          headers: { 'Content-Type': file.type },
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      }
    } catch (error) {
      console.error('Failed to add unit:', error);
      alert('Failed to add unit');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const token = localStorage.getItem('rigid_id_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/${unitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Rigid Residential
            </Link>
            <div className="flex gap-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/buildings" className="text-gray-600 hover:text-gray-900">Buildings</Link>
              <Link href="/portal" className="text-gray-600 hover:text-gray-900">Resident Portal</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Units Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Available Units</h1>
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
                    min="500"
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
              <div key={unit.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition relative">
                {isStaff && (
                  <button
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition font-semibold text-sm z-10"
                  >
                    Delete
                  </button>
                )}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center cursor-pointer" onClick={() => setSelectedUnit(unit)}>
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
                  </div>
                  <div className="space-y-2">
                    {unit.videoUrl && (
                      <button
                        onClick={() => setSelectedUnit(unit)}
                        className="block w-full bg-red-600 text-white text-center py-2 rounded-lg hover:bg-red-700 transition mb-2"
                      >
                        📹 Watch Video Tour
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedUnit(unit)}
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
          {selectedUnit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedUnit(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start p-6 border-b">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUnit.buildingName} - Unit {selectedUnit.unitNumber}</h3>
                  <button onClick={() => setSelectedUnit(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                    ×
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {selectedUnit.images && selectedUnit.images.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Photos</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedUnit.images.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt={`Unit ${selectedUnit.unitNumber} - Photo ${idx + 1}`} 
                            className="w-full h-48 object-cover rounded-lg"
                            onError={(e) => {
                              console.error('Image failed to load:', img);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : selectedUnit.imageUrl ? (
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Photos</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <img 
                          src={selectedUnit.imageUrl} 
                          alt={`Unit ${selectedUnit.unitNumber}`} 
                          className="w-full h-48 object-cover rounded-lg"
                          onError={(e) => {
                            console.error('Image failed to load:', selectedUnit.imageUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {selectedUnit.videoUrl && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Video Tour</h4>
                      <div className="aspect-video">
                        <iframe
                          className="w-full h-full rounded-lg"
                          src={selectedUnit.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          title="Unit Video Tour"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-lg mb-3">Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Bedrooms</p>
                        <p className="font-semibold">{selectedUnit.bedrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bathrooms</p>
                        <p className="font-semibold">{selectedUnit.bathrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Square Feet</p>
                        <p className="font-semibold">{selectedUnit.sqft}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rent</p>
                        <p className="font-semibold text-xl text-gray-900">€{selectedUnit.rent?.toLocaleString()}/mo</p>
                      </div>
                      {selectedUnit.availableDate && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Available Date</p>
                          <p className="font-semibold">{selectedUnit.availableDate}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setSelectedUnit(null)}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                    >
                      Close
                    </button>
                    <Link
                      href="/contact"
                      onClick={() => setSelectedUnit(null)}
                      className="flex-1 bg-gray-900 text-white text-center py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
                    >
                      Inquire About This Unit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
