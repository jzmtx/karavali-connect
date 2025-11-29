import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMarineWeather } from '../services/weather'
import { supabase } from '../lib/supabase'

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapViewLeaflet({ user }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [safetyPins, setSafetyPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [weather, setWeather] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Small delay to ensure container is fully rendered
    const initMap = () => {
      if (!mapContainer.current || map.current) return

      try {
        // Initialize Leaflet map
        map.current = L.map(mapContainer.current, {
          zoomControl: true
        }).setView([13.35, 74.7], 12) // Malpe, Karnataka

        // Add OpenStreetMap tiles (completely free, no API key needed)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map.current)

        // Invalidate size to ensure map renders properly
        setTimeout(() => {
          if (map.current) {
            map.current.invalidateSize()
          }
        }, 200)

        // Load safety pins after map is ready
        setTimeout(() => {
          loadSafetyPins()
        }, 300)

        // Handle map clicks
        map.current.on('click', async (e) => {
          const { lat, lng } = e.latlng
          
          // Check if there's a safety pin nearby
          const nearbyPin = safetyPins.find(pin => {
            const distance = getDistance(lat, lng, pin.gps_lat, pin.gps_lng)
            return distance < 0.001 // ~100 meters
          })

          if (nearbyPin) {
            setSelectedPin(nearbyPin)
            loadWeather(nearbyPin.gps_lat, nearbyPin.gps_lng)
          } else {
            // Create new pin on click
            const newPin = {
              gps_lat: lat,
              gps_lng: lng,
              report_count: 0,
              danger_level: 'low'
            }
            setSelectedPin(newPin)
            loadWeather(lat, lng)
          }
        })
      } catch (error) {
        console.error('Error initializing map:', error)
        setMapError('Failed to load map. Please refresh the page.')
      }
    }

    // Initialize immediately or after a short delay
    if (mapContainer.current.offsetWidth > 0) {
      initMap()
    } else {
      setTimeout(initMap, 100)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!map.current || !safetyPins.length) return

    // Clear existing markers
    map.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.current.removeLayer(layer)
      }
    })

    // Add markers for safety pins
    safetyPins.forEach(pin => {
      const marker = L.marker([pin.gps_lat, pin.gps_lng])
        .addTo(map.current)
        .bindPopup(`
          <div style="padding: 0.5rem;">
            <strong>${pin.danger_level.toUpperCase()} Danger</strong><br/>
            Reports: ${pin.report_count}
          </div>
        `)

      marker.on('click', () => {
        setSelectedPin(pin)
        loadWeather(pin.gps_lat, pin.gps_lng)
      })
    })
  }, [safetyPins])

  const loadSafetyPins = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_pins')
        .select('*')
        .order('report_count', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading safety pins:', error)
        return
      }

      if (data) {
        setSafetyPins(data)
      }
    } catch (error) {
      console.error('Error loading safety pins:', error)
    }
  }

  const loadWeather = async (lat, lng) => {
    const weatherData = await getMarineWeather(lat, lng)
    setWeather(weatherData)
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  const getDangerColor = (level) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    }
    return colors[level] || '#6b7280'
  }

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Try multiple search approaches for better results
      const searches = [
        `${query} beach Karnataka`,
        `${query} coast Karnataka`,
        `${query} Karnataka India`
      ]
      
      let allResults = []
      
      for (const searchTerm of searches) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&countrycodes=in`
        )
        const data = await response.json()
        allResults = [...allResults, ...data]
      }
      
      // Remove duplicates and filter for coastal areas
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.place_id === item.place_id)
      )
      
      const coastalResults = uniqueResults.filter(item => {
        const name = item.display_name.toLowerCase()
        const type = item.type?.toLowerCase() || ''
        return name.includes('beach') || 
               name.includes('coast') || 
               name.includes('shore') || 
               name.includes('bay') || 
               name.includes('port') || 
               name.includes('malpe') ||
               name.includes('udupi') ||
               name.includes('mangalore') ||
               name.includes('karwar') ||
               name.includes('gokarna') ||
               name.includes('murudeshwar') ||
               type.includes('beach')
      })
      
      const results = coastalResults.slice(0, 5).map(item => ({
        name: item.display_name.split(',')[0], // Show shorter name
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }))
      
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        
        if (map.current) {
          map.current.setView([latitude, longitude], 15)
          
          // Add user location marker
          L.marker([latitude, longitude])
            .addTo(map.current)
            .bindPopup('📍 Your Location')
            .openPopup()
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to get your location. Please check your browser settings.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const goToLocation = (lat, lng, name) => {
    if (map.current) {
      map.current.setView([lat, lng], 15)
      
      // Add marker for searched location
      L.marker([lat, lng])
        .addTo(map.current)
        .bindPopup(`📍 ${name}`)
        .openPopup()
    }
    setSearchQuery('')
    setSearchResults([])
  }

  if (mapError) {
    return (
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{mapError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Location Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchLocation(e.target.value)
              }}
              placeholder="Search beach locations..."
              className="form-input"
              style={{ paddingRight: isSearching ? '3rem' : undefined }}
            />
            {isSearching && (
              <div style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-red)',
                fontSize: '1.25rem'
              }}>
                🔍
              </div>
            )}
          </div>
          <button
            onClick={getCurrentLocation}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            📍 Current Location
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => goToLocation(result.lat, result.lng, result.name)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  color: 'white',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: index < searchResults.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(220,20,60,0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  🏖️ {result.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                  {result.fullName || result.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  📍 {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '500px', 
          borderRadius: '8px', 
          overflow: 'hidden',
          minHeight: '500px',
          position: 'relative',
          zIndex: 0,
          background: '#e5e7eb'
        }} 
      />

      {selectedPin && (
        <div style={{
          marginTop: '1.5rem',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--glass-border)',
          padding: '1rem',
          borderRadius: '12px'
        }}>
          <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>
            📍 Location Safety
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {selectedPin.gps_lat.toFixed(6)}, {selectedPin.gps_lng.toFixed(6)}
          </p>

          {weather && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ color: 'rgb(147, 197, 253)', fontWeight: '500', marginBottom: '0.75rem' }}>
                🌊 Marine Weather
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ color: 'rgb(147, 197, 253)' }}>
                  <strong>Wave Height:</strong> {weather.waveHeight?.toFixed(2) || 'N/A'}m
                </div>
                <div style={{ color: 'rgb(147, 197, 253)' }}>
                  <strong>Wind Speed:</strong> {weather.windSpeed?.toFixed(1) || 'N/A'} km/h
                </div>
              </div>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                borderRadius: '6px',
                textAlign: 'center',
                fontWeight: '600',
                background: weather.isSafe ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                color: weather.isSafe ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)',
                border: weather.isSafe ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)'
              }}>
                {weather.isSafe ? '✅ Safe Conditions' : '⚠️ Unsafe Conditions'}
              </div>
            </div>
          )}

          {selectedPin.report_count > 0 && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '600',
              color: 'white',
              backgroundColor: getDangerColor(selectedPin.danger_level)
            }}>
              {selectedPin.report_count} Report{selectedPin.report_count > 1 ? 's' : ''} • {selectedPin.danger_level.toUpperCase()} Risk
            </div>
          )}
        </div>
      )}
    </div>
  )
}

