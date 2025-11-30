import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LocationSearch from './LocationSearch';

const ManualLocationManager = ({ user }) => {
  const [locations, setLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    lat: '',
    lng: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadManualLocations();
  }, [user]);

  const loadManualLocations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_manual_locations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const handleLocationSelect = (locationData) => {
    setNewLocation({
      name: locationData.display_name || 'Selected Location',
      lat: locationData.lat,
      lng: locationData.lon,
      address: locationData.display_name || ''
    });
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLocation({
          ...newLocation,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        setError('Failed to get current location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addLocation = async () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('add_manual_location', {
        user_id_param: user.id,
        location_name_param: newLocation.name,
        lat: parseFloat(newLocation.lat),
        lng: parseFloat(newLocation.lng),
        address_param: newLocation.address
      });

      if (error) throw error;

      if (data.success) {
        setMessage('Location added successfully!');
        setNewLocation({ name: '', lat: '', lng: '', address: '' });
        setShowAddForm(false);
        loadManualLocations();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to add location');
    } finally {
      setLoading(false);
    }
  };

  const removeLocation = async (locationId) => {
    if (!confirm('Are you sure you want to remove this location?')) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('remove_manual_location', {
        user_id_param: user.id,
        location_id_param: locationId
      });

      if (error) throw error;

      if (data.success) {
        setMessage('Location removed successfully!');
        loadManualLocations();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to remove location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">📍 My Locations</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          {showAddForm ? 'Cancel' : '+ Add Location'}
        </button>
      </div>

      {message && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4">
          <p className="text-green-300 text-sm">{message}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="bg-black/20 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-3">Add New Location</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-red-200 text-sm font-medium mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                placeholder="Home, Office, etc."
                className="w-full p-3 bg-black/30 border border-red-700/30 rounded-lg text-white placeholder-red-300/50 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-red-200 text-sm font-medium mb-1">
                Search Location
              </label>
              <LocationSearch onLocationSelect={handleLocationSelect} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-red-200 text-sm font-medium mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={newLocation.lat}
                  onChange={(e) => setNewLocation({...newLocation, lat: e.target.value})}
                  placeholder="12.3456"
                  className="w-full p-3 bg-black/30 border border-red-700/30 rounded-lg text-white placeholder-red-300/50 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-red-200 text-sm font-medium mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={newLocation.lng}
                  onChange={(e) => setNewLocation({...newLocation, lng: e.target.value})}
                  placeholder="76.7890"
                  className="w-full p-3 bg-black/30 border border-red-700/30 rounded-lg text-white placeholder-red-300/50 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              {loading ? 'Getting Location...' : '📍 Use Current Location'}
            </button>

            <div>
              <label className="block text-red-200 text-sm font-medium mb-1">
                Address (Optional)
              </label>
              <input
                type="text"
                value={newLocation.address}
                onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                placeholder="Full address"
                className="w-full p-3 bg-black/30 border border-red-700/30 rounded-lg text-white placeholder-red-300/50 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addLocation}
                disabled={loading || !newLocation.name || !newLocation.lat || !newLocation.lng}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? 'Adding...' : 'Add Location'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewLocation({ name: '', lat: '', lng: '', address: '' });
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {locations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No saved locations yet</p>
            <p className="text-sm mt-2">Add locations for quick access</p>
          </div>
        ) : (
          locations.map((location) => (
            <div
              key={location.id}
              className="bg-black/20 backdrop-blur-sm border border-red-500/30 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">
                    📍 {location.location_name}
                  </h4>
                  <p className="text-red-300/80 text-sm mb-1">
                    {location.gps_lat.toFixed(6)}, {location.gps_lng.toFixed(6)}
                  </p>
                  {location.address && (
                    <p className="text-red-300/60 text-sm">{location.address}</p>
                  )}
                  <p className="text-red-400/60 text-xs mt-2">
                    Added: {new Date(location.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => removeLocation(location.id)}
                  disabled={loading}
                  className="btn btn-secondary"
                  title="Remove location"
                  style={{ padding: '0.5rem', minHeight: 'auto' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-yellow-300 text-sm">
          ⚠️ <strong>Note:</strong> These are saved locations for convenience. Activities like cleanup and safety reports will verify your actual GPS location for security.
        </p>
      </div>
    </div>
  );
};

export default ManualLocationManager;