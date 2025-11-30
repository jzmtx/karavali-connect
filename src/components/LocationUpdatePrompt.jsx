import React, { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';

const LocationUpdatePrompt = ({ user, onLocationUpdated, onCancel }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(locationService.formatTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleUpdateLocation = async () => {
    setIsUpdating(true);
    setError('');

    try {
      console.log('Updating location for user:', user.id);
      const result = await locationService.updateUserLocation(user.id);
      console.log('Location update result:', result);
      
      if (result.success) {
        // Wait a moment for database to process
        setTimeout(() => {
          onLocationUpdated(result);
        }, 500);
      } else {
        setError('Failed to update location');
      }
    } catch (error) {
      console.error('Location update error:', error);
      
      if (error.code === 1) {
        setError('Location access denied. Please enable location permissions.');
      } else if (error.code === 2) {
        setError('Location unavailable. Please check your GPS settings.');
      } else if (error.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Failed to get location. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-red-900/90 to-black/90 backdrop-blur-md border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            Location Update Required
          </h3>
          
          <p className="text-gray-300 text-sm mb-4">
            Your location data has expired. Please update your location to continue using location-based features.
          </p>

          {timeRemaining && timeRemaining !== 'Expired' && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm">
                Current location expires in: <span className="font-semibold">{timeRemaining}</span>
              </p>
            </div>
          )}

          {timeRemaining === 'Expired' && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm font-semibold">
                Location data has expired
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleUpdateLocation}
            disabled={isUpdating}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating Location...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Update My Location
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="w-full bg-gray-600/50 hover:bg-gray-600/70 disabled:bg-gray-700/50 text-gray-300 font-medium py-3 px-4 rounded-xl transition-all duration-200"
          >
            Access Wallet & Profile Only
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-xs">
            Location updates are valid for 12 hours. You can access your wallet and profile without updating location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationUpdatePrompt;