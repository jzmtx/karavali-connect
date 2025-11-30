import { useState, useEffect } from 'react'

export default function LocationSearch({ onLocationSelect, placeholder = "Search beach location..." }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchLocation = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' beach Karnataka India')}&limit=5&countrycodes=in`
      )
      const data = await response.json()
      
      const locations = data.map(item => ({
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type
      }))
      
      setSuggestions(locations)
      setShowSuggestions(true)
    } catch (err) {
      console.error('Location search error:', err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocation(searchTerm)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleLocationSelect = (location) => {
    setSearchTerm(location.name)
    setShowSuggestions(false)
    onLocationSelect({
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      fullAddress: location.fullName
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        className="form-input"
        style={{ 
          width: '100%',
          paddingRight: loading ? '2.5rem' : '1rem'
        }}
      />
      
      {loading && (
        <div style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.6)'
        }}>
          🔍
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          marginTop: '0.25rem',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          {suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(location)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: 'none',
                background: 'transparent',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--glass-border)' : 'none',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                📍 {location.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                {location.fullName}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {showSuggestions && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}