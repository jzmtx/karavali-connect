import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LocationSearch from './LocationSearch'

export default function BeachSelector({ user, onBeachSelect, selectedBeach }) {
  const [nearbyBeaches, setNearbyBeaches] = useState([])
  const [filteredBeaches, setFilteredBeaches] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualBeachName, setManualBeachName] = useState('')

  useEffect(() => {
    loadAllBeaches()
    getCurrentLocationAndBeaches()
  }, [])

  const getCurrentLocationAndBeaches = async () => {
    setLoading(true)
    try {
      // Get user's current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setUserLocation({ lat, lng })

      // Try to detect beach automatically
      const { data: detectionResult, error: detectionError } = await supabase
        .rpc('detect_user_beach', {
          user_lat: lat,
          user_lng: lng
        })

      if (detectionResult?.detected) {
        // Auto-select detected beach
        const detectedBeach = {
          beach_id: detectionResult.beach_id,
          name: detectionResult.beach_name,
          distance_km: (detectionResult.distance / 1000).toFixed(2),
          gps_lat: lat,
          gps_lng: lng
        }
        onBeachSelect(detectedBeach)
        setMessage(`📍 Detected: ${detectionResult.beach_name}`)
      }

      // Beaches already loaded in useEffect

    } catch (err) {
      setError('Location not available. Please select from list or search manually.')
      setMessage('')
    } finally {
      setLoading(false)
    }
  }

  const loadAllBeaches = async () => {
    try {
      const { data, error } = await supabase
        .from('beaches')
        .select('beach_id, name, district, gps_lat, gps_lng')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      
      const beachesWithDistance = data.map(beach => ({
        ...beach,
        distance_km: null
      }))
      
      setNearbyBeaches(beachesWithDistance)
      setFilteredBeaches(beachesWithDistance)
    } catch (err) {
      setError('Unable to load beaches. You can search or enter manually.')
    }
  }

  const handleBeachSelect = (beach) => {
    const beachWithLocation = {
      ...beach,
      gps_lat: userLocation?.lat || beach.gps_lat,
      gps_lng: userLocation?.lng || beach.gps_lng
    }
    onBeachSelect(beachWithLocation)
    setMessage(`✅ Selected: ${beach.name}`)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    if (!term.trim()) {
      setFilteredBeaches(nearbyBeaches)
    } else {
      const filtered = nearbyBeaches.filter(beach => 
        beach.name.toLowerCase().includes(term.toLowerCase()) ||
        beach.district.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredBeaches(filtered)
    }
  }

  const handleManualBeachSelect = () => {
    if (!manualBeachName.trim()) return
    
    const manualBeach = {
      beach_id: manualBeachName.toLowerCase().replace(/\s+/g, '_'),
      name: manualBeachName,
      district: 'Manual Entry',
      gps_lat: userLocation?.lat || 0,
      gps_lng: userLocation?.lng || 0
    }
    
    onBeachSelect(manualBeach)
    setMessage(`✅ Manual Entry: ${manualBeachName}`)
    setShowManualEntry(false)
    setManualBeachName('')
  }

  const searchLocationAndUpdate = async () => {
    if (!selectedBeach) return
    
    try {
      setLoading(true)
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude
      
      const updatedBeach = {
        ...selectedBeach,
        gps_lat: lat,
        gps_lng: lng
      }
      
      onBeachSelect(updatedBeach)
      setMessage(`📍 Location updated for ${selectedBeach.name}`)
    } catch (err) {
      setError('Unable to update location. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        background: 'var(--glass-bg)',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid var(--glass-border)',
        textAlign: 'center'
      }}>
        <div style={{ color: 'white', marginBottom: '0.5rem', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>🌊 Finding nearby beaches...</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>Getting your location</div>
      </div>
    )
  }

  return (
    <div className="beach-selector" style={{
      background: 'var(--glass-bg)',
      padding: 'clamp(0.75rem, 2vw, 1rem)',
      borderRadius: '12px',
      border: '1px solid var(--glass-border)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
        🏖️ Select Beach Location
      </h3>
      
      <div style={{ 
        background: 'rgba(59, 130, 246, 0.2)', 
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: 'clamp(0.5rem, 2vw, 0.75rem)',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
        color: 'rgb(147, 197, 253)',
        lineHeight: '1.4'
      }}>
        📍 <strong>Auto-detect</strong> or <strong>search & select</strong> any beach below
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.15)',
          color: 'rgb(254, 240, 138)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          border: '1px solid rgba(255, 193, 7, 0.3)'
        }}>
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          color: 'rgb(134, 239, 172)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {message}
        </div>
      )}

      {selectedBeach && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ color: 'rgb(134, 239, 172)', fontWeight: '600', fontSize: '0.875rem' }}>
                ✅ Selected: {selectedBeach.name}, {selectedBeach.district}
              </div>
              {selectedBeach.distance_km && (
                <div style={{ color: 'rgba(134, 239, 172, 0.8)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  📍 {selectedBeach.distance_km} km away
                </div>
              )}
            </div>
            <button
              onClick={searchLocationAndUpdate}
              disabled={loading}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(59, 130, 246, 0.3)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '6px',
                color: 'rgb(147, 197, 253)',
                fontSize: '0.75rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? '🔄' : '📍'} Update Location
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: '0.75rem',
          alignItems: window.innerWidth < 768 ? 'stretch' : 'center',
          marginBottom: '0.75rem'
        }}>
          <h4 style={{ 
            color: 'white', 
            fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)', 
            margin: 0,
            flex: 1
          }}>
            🏖️ Select Beach <span style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)', color: 'rgba(255,255,255,0.6)' }}>({filteredBeaches.length})</span>
          </h4>
          
          <input
            type="text"
            placeholder="Search beaches..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
              width: window.innerWidth < 768 ? '100%' : '200px',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ 
          maxHeight: 'clamp(200px, 40vh, 300px)', 
          overflowY: 'auto', 
          border: '1px solid var(--glass-border)', 
          borderRadius: '8px', 
          background: 'rgba(0,0,0,0.2)'
        }}>
          {filteredBeaches.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 'clamp(1rem, 4vw, 2rem)' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.5rem' }}>🌊</div>
              <div style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginBottom: '1rem' }}>
                {searchTerm ? 'No beaches found' : nearbyBeaches.length === 0 ? 'Loading beaches...' : 'No beaches available'}
              </div>
              <button
                onClick={() => setShowManualEntry(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(34, 197, 94, 0.3)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  borderRadius: '6px',
                  color: 'rgb(134, 239, 172)',
                  fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                  cursor: 'pointer'
                }}
              >
                ✏️ Enter Beach Manually
              </button>
            </div>
          ) : (
            filteredBeaches.map((beach) => (
              <button
                key={beach.beach_id}
                onClick={() => handleBeachSelect(beach)}
                style={{
                  width: '100%',
                  padding: 'clamp(0.75rem, 3vw, 1rem)',
                  marginBottom: '0',
                  background: selectedBeach?.beach_id === beach.beach_id 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--glass-border)',
                  color: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (selectedBeach?.beach_id !== beach.beach_id) {
                    e.target.style.background = 'rgba(255,255,255,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedBeach?.beach_id !== beach.beach_id) {
                    e.target.style.background = 'transparent'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)', marginBottom: '0.25rem' }}>
                      🏖️ {beach.name}
                    </div>
                    <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)', color: 'rgba(255,255,255,0.7)' }}>
                      📍 {beach.district}
                      {beach.distance_km && ` • ${beach.distance_km} km away`}
                    </div>
                  </div>
                  {selectedBeach?.beach_id === beach.beach_id && (
                    <div style={{ color: 'rgb(34, 197, 94)', fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>✓</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: window.innerWidth < 480 ? 'column' : 'row' }}>
        <button
          onClick={getCurrentLocationAndBeaches}
          disabled={loading}
          className="detect-btn"
          style={{
            flex: 1,
            padding: 'clamp(0.75rem, 3vw, 1rem)',
            background: loading ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '8px',
            color: 'rgb(147, 197, 253)',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? '🔄' : '📍'} {loading ? 'Detecting...' : 'Auto-Detect'}
        </button>
        
        <button
          onClick={() => setShowManualEntry(true)}
          style={{
            padding: 'clamp(0.75rem, 3vw, 1rem)',
            background: 'rgba(34, 197, 94, 0.3)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '8px',
            color: 'rgb(134, 239, 172)',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
            cursor: 'pointer',
            fontWeight: '500',
            minHeight: '44px',
            whiteSpace: 'nowrap'
          }}
        >
          🔍 Location Search
        </button>
      </div>
      
      {showManualEntry && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px'
        }}>
          <h4 style={{ color: 'rgb(134, 239, 172)', marginBottom: '0.75rem', fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)' }}>
            🔍 Search Beach Location
          </h4>
          <div style={{ marginBottom: '0.75rem' }}>
            <LocationSearch
              placeholder="Search beach location..."
              onLocationSelect={(location) => {
                const beachData = {
                  beach_id: location.name.toLowerCase().replace(/\s+/g, '_'),
                  name: location.name,
                  district: 'Search Result',
                  gps_lat: location.lat,
                  gps_lng: location.lng
                }
                onBeachSelect(beachData)
                setMessage(`📍 Selected: ${location.name}`)
                setShowManualEntry(false)
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(34, 197, 94, 0.3)' }}></div>
            <span style={{ color: 'rgba(134, 239, 172, 0.7)', fontSize: '0.75rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(34, 197, 94, 0.3)' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Type beach name..."
              value={manualBeachName}
              onChange={(e) => setManualBeachName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualBeachSelect()}
              style={{
                flex: 1,
                padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
                outline: 'none'
              }}
            />
            <button
              onClick={handleManualBeachSelect}
              disabled={!manualBeachName.trim()}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 3vw, 1rem)',
                background: manualBeachName.trim() ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '6px',
                color: 'rgb(134, 239, 172)',
                fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                cursor: manualBeachName.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap'
              }}
            >
              ✅ Use
            </button>
            <button
              onClick={() => {
                setShowManualEntry(false)
                setManualBeachName('')
              }}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                background: 'rgba(239, 68, 68, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '6px',
                color: 'rgb(252, 165, 165)',
                fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                cursor: 'pointer'
              }}
            >
              ❌
            </button>
          </div>
        </div>
      )}
    </div>
  )
}