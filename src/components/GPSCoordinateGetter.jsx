import { useState } from 'react'

export default function GPSCoordinateGetter() {
  const [coordinates, setCoordinates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getCurrentLocation = () => {
    setLoading(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setCoordinates(coords)
        setLoading(false)
        
        // Copy to clipboard
        const coordText = `${coords.latitude}, ${coords.longitude}`
        navigator.clipboard.writeText(coordText)
      },
      (error) => {
        setError(`Error: ${error.message}`)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div className="glass-card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>🌍 Get GPS Coordinates</h2>
      
      <button 
        onClick={getCurrentLocation}
        disabled={loading}
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: '1rem' }}
      >
        {loading ? 'Getting Location...' : '📍 Get My Coordinates'}
      </button>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {coordinates && (
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.2)', 
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem'
        }}>
          <h3 style={{ color: 'rgb(134, 239, 172)', margin: '0 0 0.5rem 0' }}>
            ✅ Coordinates Retrieved
          </h3>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'white' }}>
            <div><strong>Latitude:</strong> {coordinates.latitude}</div>
            <div><strong>Longitude:</strong> {coordinates.longitude}</div>
            <div><strong>Accuracy:</strong> {coordinates.accuracy}m</div>
          </div>
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.8)'
          }}>
            📋 Coordinates copied to clipboard!<br/>
            Use these in your SQL: {coordinates.latitude}, {coordinates.longitude}
          </div>
        </div>
      )}
    </div>
  )
}