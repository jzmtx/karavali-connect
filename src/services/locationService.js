import { supabase } from '../lib/supabase';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.locationExpiry = null;
    this.watchId = null;
  }

  // Check if current location is valid (not expired)
  async checkLocationValidity(userId) {
    try {
      const { data, error } = await supabase.rpc('check_user_location_validity', {
        user_id_param: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking location validity:', error);
      return { valid: false, expired: true, message: 'Error checking location' };
    }
  }

  // Get current GPS location with high accuracy
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  // Update user location in database with 12-hour expiry
  async updateUserLocation(userId) {
    try {
      const location = await this.getCurrentLocation();
      
      const { data, error } = await supabase.rpc('update_user_location', {
        user_id_param: userId,
        lat: location.lat,
        lng: location.lng,
        accuracy_param: location.accuracy
      });

      if (error) throw error;

      // Store in local state
      this.currentLocation = location;
      this.locationExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

      // Verify the update by checking database
      const verification = await this.checkLocationValidity(userId);
      
      return {
        success: true,
        location,
        expiresAt: this.locationExpiry,
        message: 'Location updated successfully',
        verified: verification.valid,
        timeRemaining: this.formatTimeRemaining()
      };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  // Check if location needs update (expired or close to expiry)
  needsLocationUpdate(userRole = 'tourist') {
    // Merchants and authorities never need location updates
    if (['merchant', 'beach_authority', 'municipality', 'fisheries_department', 'admin'].includes(userRole)) {
      return false;
    }
    
    if (!this.locationExpiry) return true;
    
    const now = new Date();
    const timeLeft = this.locationExpiry - now;
    
    // Need update if expired or less than 1 hour remaining
    return timeLeft <= 0 || timeLeft < (60 * 60 * 1000);
  }

  // Get time remaining until location expires
  getTimeRemaining() {
    if (!this.locationExpiry) return 0;
    
    const now = new Date();
    const timeLeft = this.locationExpiry - now;
    
    return Math.max(0, timeLeft);
  }

  // Format time remaining as human readable
  formatTimeRemaining() {
    const timeLeft = this.getTimeRemaining();
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  // Initialize location service for a user
  async initializeForUser(userId, userRole = 'tourist') {
    try {
      // Merchants and authorities always have valid location
      if (['merchant', 'beach_authority', 'municipality', 'fisheries_department', 'admin'].includes(userRole)) {
        return {
          success: true,
          needsUpdate: false,
          location: null,
          timeRemaining: 'Permanent access',
          isPermanent: true
        };
      }
      
      const validity = await this.checkLocationValidity(userId);
      
      if (validity.valid) {
        this.currentLocation = {
          lat: validity.gps_lat,
          lng: validity.gps_lng,
          accuracy: validity.accuracy,
          timestamp: new Date(validity.updated_at)
        };
        this.locationExpiry = new Date(validity.expires_at);
        
        return {
          success: true,
          needsUpdate: false,
          location: this.currentLocation,
          timeRemaining: this.formatTimeRemaining()
        };
      } else {
        return {
          success: false,
          needsUpdate: true,
          message: validity.message
        };
      }
    } catch (error) {
      console.error('Error initializing location service:', error);
      return {
        success: false,
        needsUpdate: true,
        message: 'Error checking location status'
      };
    }
  }

  // Force refresh location status from database
  async forceRefreshLocation(userId, userRole = 'tourist') {
    try {
      // Clear local cache first
      this.currentLocation = null;
      this.locationExpiry = null;
      
      // Re-initialize from database
      return await this.initializeForUser(userId, userRole);
    } catch (error) {
      console.error('Error force refreshing location:', error);
      return {
        success: false,
        needsUpdate: true,
        message: 'Error refreshing location status'
      };
    }
  }

  // Clear location data
  clearLocation() {
    this.currentLocation = null;
    this.locationExpiry = null;
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export const locationService = new LocationService();