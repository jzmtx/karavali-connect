import { supabase } from '../lib/supabase';

class ActivityVerificationService {
  // Get current high-accuracy GPS location
  async getCurrentGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          });
        },
        (error) => {
          let message = 'Location access failed';
          switch (error.code) {
            case 1:
              message = 'Location access denied. Please enable location permissions.';
              break;
            case 2:
              message = 'Location unavailable. Please check your GPS settings.';
              break;
            case 3:
              message = 'Location request timed out. Please try again.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0 // Always get fresh location
        }
      );
    });
  }

  // Verify user is actually at the location for activity
  async verifyActivityLocation(userId, beachId, activityType) {
    try {
      // Get current GPS location
      const currentLocation = await this.getCurrentGPS();
      
      // Verify with database
      const { data, error } = await supabase.rpc('verify_activity_location', {
        user_id_param: userId,
        current_lat: currentLocation.lat,
        current_lng: currentLocation.lng,
        beach_id_param: beachId,
        activity_type: activityType
      });

      if (error) throw error;

      return {
        ...data,
        currentLocation,
        accuracy: currentLocation.accuracy
      };
    } catch (error) {
      console.error('Activity verification error:', error);
      throw error;
    }
  }

  // Continuous location monitoring for activities
  startLocationMonitoring(callback, options = {}) {
    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // 5 second cache
      ...options
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        });
      },
      (error) => {
        callback({ error: error.message });
      },
      watchOptions
    );
  }

  // Stop location monitoring
  stopLocationMonitoring(watchId) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Check if accuracy is sufficient for activity
  isAccuracySufficient(accuracy, activityType) {
    const requiredAccuracy = {
      'cleanup': 20, // 20 meters for cleanup
      'safety_report': 30, // 30 meters for safety reports
      'bin_report': 15, // 15 meters for bin reports
      'dispose': 10 // 10 meters for disposal
    };

    return accuracy <= (requiredAccuracy[activityType] || 25);
  }

  // Format verification result for UI
  formatVerificationResult(result) {
    if (!result.valid) {
      return {
        success: false,
        title: 'Location Verification Failed',
        message: result.message,
        action: 'Move closer to the beach area'
      };
    }

    if (!result.verified) {
      return {
        success: false,
        title: 'Need to be Closer',
        message: `You're at ${result.beach_name} but need to be within ${result.required_distance}m for ${result.activity_type}`,
        action: `Move closer (currently ${Math.round(result.distance)}m away)`
      };
    }

    return {
      success: true,
      title: 'Location Verified',
      message: `Ready for ${result.activity_type} at ${result.beach_name}`,
      distance: Math.round(result.distance)
    };
  }
}

export const activityVerificationService = new ActivityVerificationService();