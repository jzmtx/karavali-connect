import { useState } from 'react'

export default function LocationHelper() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getCurrentLocation = async () => {
    setLoading(true)
    setError('')
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      })
      
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      
      setLocation({ lat, lng, accuracy: position.coords.accuracy })
    } catch (err) {
      setError('Failed to get location: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySQL = () => {
    if (!location) return
    
    const sql = `-- Update test_setup.sql with your coordinates
-- Replace all instances of 12.9716, 77.5946 with your coordinates:

-- Your coordinates: ${location.lat}, ${location.lng}

-- Beach coordinates:
gps_lat = ${location.lat},
gps_lng = ${location.lng},

-- Bin coordinates:  
${location.lat}, ${location.lng},

-- Merchant coordinates:
shop_gps_lat = ${location.lat},
shop_gps_lng = ${location.lng},`

    navigator.clipboard.writeText(sql)
    alert('SQL coordinates copied to clipboard!')
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '300px'
    }}>
      <h4 style={{ margin: 0, marginBottom: '1rem', color: '#333' }}>
        🧪 Test Setup Helper
      </h4>
      
      <button
        onClick={getCurrentLocation}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#1e40af',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
      >
        {loading ? 'Getting Location...' : '📍 Get My Location'}
      </button>

      {error && (
        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {location && (
        <div style={{ fontSize: '0.875rem', color: '#333' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Your Coordinates:</strong>
          </div>
          <div style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
            Lat: {location.lat}<br/>
            Lng: {location.lng}<br/>
            Accuracy: {Math.round(location.accuracy)}m
          </div>
          
          <button
            onClick={copySQL}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            📋 Copy SQL Coordinates
          </button>
          
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
            1. Copy coordinates above<br/>
            2. Update test_setup.sql file<br/>
            3. Run SQL in Supabase<br/>
            4. Test with your location!
          </div>
        </div>
      )}
    </div>
  )
}