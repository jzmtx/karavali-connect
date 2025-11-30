import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getBeachConditions } from '../services/weather'
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
  const [beachConditions, setBeachConditions] = useState(null)
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
            loadBeachConditions(nearbyPin.gps_lat, nearbyPin.gps_lng)
          } else {
            // Create new pin on click
            const newPin = {
              gps_lat: lat,
              gps_lng: lng,
              report_count: 0,
              danger_level: 'low'
            }
            setSelectedPin(newPin)
            loadBeachConditions(lat, lng)
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
        loadBeachConditions(pin.gps_lat, pin.gps_lng)
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

  const loadBeachConditions = async (lat, lng) => {
    const conditions = await getBeachConditions(lat, lng)
    setBeachConditions(conditions)
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
      // Predefined beach locations for better results
      const knownBeaches = [
        { name: 'Malpe Beach', lat: 13.3503, lng: 74.7042, district: 'Udupi' },
        { name: 'Kaup Beach', lat: 13.2333, lng: 74.7500, district: 'Udupi' },
        { name: 'Panambur Beach', lat: 12.8625, lng: 74.8097, district: 'Mangalore' },
        { name: 'Tannirbhavi Beach', lat: 12.8333, lng: 74.8000, district: 'Mangalore' },
        { name: 'Gokarna Beach', lat: 14.5492, lng: 74.3200, district: 'Uttara Kannada' },
        { name: 'Om Beach', lat: 14.5333, lng: 74.3167, district: 'Gokarna' },
        { name: 'Kudle Beach', lat: 14.5400, lng: 74.3150, district: 'Gokarna' },
        { name: 'Half Moon Beach', lat: 14.5350, lng: 74.3100, district: 'Gokarna' },
        { name: 'Paradise Beach', lat: 14.5300, lng: 74.3050, district: 'Gokarna' },
        { name: 'Murudeshwar Beach', lat: 14.0942, lng: 74.4850, district: 'Bhatkal' },
        { name: 'Karwar Beach', lat: 14.8142, lng: 74.1297, district: 'Karwar' },
        { name: 'Devbagh Beach', lat: 14.8500, lng: 74.1000, district: 'Karwar' },
        { name: 'Murdeshwar Temple Beach', lat: 14.0942, lng: 74.4850, district: 'Bhatkal' },
        { name: 'Kundapura Beach', lat: 13.6167, lng: 74.6833, district: 'Kundapura' },
        { name: 'Maravanthe Beach', lat: 13.6000, lng: 74.7000, district: 'Kundapura' },
        { name: 'Ullal Beach', lat: 12.8000, lng: 74.8667, district: 'Mangalore' },
        { name: 'Surathkal Beach', lat: 13.0167, lng: 74.7833, district: 'Mangalore' },
        { name: 'Someshwar Beach', lat: 12.7833, lng: 74.8833, district: 'Mangalore' }
      ]

      // Filter known beaches first
      const matchingBeaches = knownBeaches.filter(beach => 
        beach.name.toLowerCase().includes(query.toLowerCase()) ||
        beach.district.toLowerCase().includes(query.toLowerCase())
      )

      let results = matchingBeaches.map(beach => ({
        name: beach.name,
        fullName: `${beach.name}, ${beach.district}, Karnataka`,
        lat: beach.lat,
        lng: beach.lng
      }))

      // If no known beaches match, search online
      if (results.length === 0) {
        const searches = [
          `${query} beach Karnataka India`,
          `${query} coast Karnataka`,
          `${query} Karnataka beach`
        ]
        
        let allResults = []
        
        for (const searchTerm of searches) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=3&countrycodes=in&bounded=1&viewbox=73.5,15.5,75.5,11.5`
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
                 name.includes('karnataka') ||
                 type.includes('beach')
        })
        
        results = coastalResults.slice(0, 5).map(item => ({
          name: item.display_name.split(',')[0],
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }))
      }
      
      setSearchResults(results.slice(0, 8))
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
      
      // Load beach conditions for selected location
      const beachPin = {
        gps_lat: lat,
        gps_lng: lng,
        report_count: 0,
        danger_level: 'low'
      }
      setSelectedPin(beachPin)
      loadBeachConditions(lat, lng)
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

          {beachConditions && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ color: 'rgb(147, 197, 253)', fontWeight: '500', marginBottom: '0.75rem' }}>
                🏖️ Beach Conditions
              </h4>
              
              {/* Safety Status */}
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600',
                marginBottom: '1rem',
                background: `${beachConditions.safetyColor}33`,
                color: beachConditions.safetyColor,
                border: `1px solid ${beachConditions.safetyColor}66`
              }}>
                {beachConditions.safetyLevel === 'safe' ? '✅' : beachConditions.safetyLevel === 'caution' ? '⚠️' : '🚨'} {beachConditions.safetyText}
              </div>

              {/* Weather Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ color: 'rgb(147, 197, 253)' }}>
                  <strong>Wave Height:</strong> {beachConditions.waveHeight?.toFixed(1) || 'N/A'}m
                </div>
                <div style={{ color: 'rgb(147, 197, 253)' }}>
                  <strong>Wind Speed:</strong> {beachConditions.windSpeed?.toFixed(0) || 'N/A'} km/h
                </div>
                {beachConditions.windGusts > beachConditions.windSpeed + 5 && (
                  <div style={{ color: 'rgb(252, 165, 165)' }}>
                    <strong>Wind Gusts:</strong> {beachConditions.windGusts?.toFixed(0)} km/h
                  </div>
                )}
                {beachConditions.maxWaveHeight > beachConditions.waveHeight + 0.3 && (
                  <div style={{ color: 'rgb(252, 165, 165)' }}>
                    <strong>Max Waves:</strong> {beachConditions.maxWaveHeight?.toFixed(1)}m
                  </div>
                )}
              </div>

              {/* Detailed Conditions */}
              <div style={{ fontSize: '0.8rem', color: 'rgb(147, 197, 253)' }}>
                <strong>Current Conditions:</strong>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                  {beachConditions.conditions?.map((condition, index) => (
                    <li key={index} style={{ marginBottom: '0.25rem' }}>{condition}</li>
                  ))}
                </ul>
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

