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
    <div className="map-container">
      {/* Enhanced Map Header */}
      <div className="map-header">
        <div className="map-title-section">
          <h2 className="map-title">🗺️ Interactive Beach Map</h2>
          <p className="map-subtitle">Explore beaches, check safety conditions, and find locations</p>
        </div>
      </div>

      {/* Enhanced Location Search */}
      <div className="map-search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchLocation(e.target.value)
              }}
              placeholder="Search beaches, locations, or coordinates..."
              className="map-search-input"
            />
            {isSearching && (
              <div className="search-loading">
                <div className="search-spinner"></div>
              </div>
            )}
          </div>
          <button
            onClick={getCurrentLocation}
            className="current-location-btn"
          >
            <span className="location-icon">📍</span>
            <span className="location-text">My Location</span>
          </button>
        </div>

        {/* Enhanced Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="search-results-header">
              <span className="results-count">{searchResults.length} locations found</span>
              <button 
                onClick={() => { setSearchResults([]); setSearchQuery('') }}
                className="clear-results-btn"
              >
                ✕
              </button>
            </div>
            <div className="search-results-list">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => goToLocation(result.lat, result.lng, result.name)}
                  className="search-result-item"
                >
                  <div className="result-icon">🏖️</div>
                  <div className="result-content">
                    <div className="result-name">{result.name}</div>
                    <div className="result-address">{result.fullName || result.name}</div>
                    <div className="result-coords">
                      📍 {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                    </div>
                  </div>
                  <div className="result-arrow">→</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Map Container */}
      <div className="map-wrapper">
        <div className="map-controls">
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-marker safe"></span>
              <span>Safe Areas</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker caution"></span>
              <span>Caution Areas</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker danger"></span>
              <span>Danger Areas</span>
            </div>
          </div>
        </div>
        
        <div 
          ref={mapContainer} 
          className="interactive-map"
        />
        
        {!selectedPin && (
          <div className="map-instructions">
            <div className="instruction-item">
              <span className="instruction-icon">👆</span>
              <span>Click on the map to get location info</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">🔍</span>
              <span>Search for specific beaches above</span>
            </div>
          </div>
        )}
      </div>

      {selectedPin && (
        <div className="location-info-panel">
          <div className="location-header">
            <h3 className="location-title">📍 Location Details</h3>
            <button 
              onClick={() => setSelectedPin(null)}
              className="close-btn"
            >
              ✕
            </button>
          </div>

          {beachConditions && (
            <div className="conditions-card">
              <div className="safety-status" style={{
                background: `${beachConditions.safetyColor}20`,
                borderColor: `${beachConditions.safetyColor}60`,
                color: beachConditions.safetyColor
              }}>
                <span className="safety-icon">
                  {beachConditions.safetyLevel === 'safe' ? '✅' : 
                   beachConditions.safetyLevel === 'caution' ? '⚠️' : '🚨'}
                </span>
                <span className="safety-text">{beachConditions.safetyText}</span>
              </div>

              <div className="weather-grid">
                <div className="weather-item">
                  <div className="weather-value">🌊 {beachConditions.waveHeight?.toFixed(1) || 'N/A'}m</div>
                  <div className="weather-label">Waves</div>
                </div>
                <div className="weather-item">
                  <div className="weather-value">💨 {beachConditions.windSpeed?.toFixed(0) || 'N/A'}</div>
                  <div className="weather-label">Wind km/h</div>
                </div>
                {beachConditions.windGusts > beachConditions.windSpeed + 5 && (
                  <div className="weather-item danger">
                    <div className="weather-value">💨 {beachConditions.windGusts?.toFixed(0)}</div>
                    <div className="weather-label">Gusts</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPin.report_count > 0 && (
            <div className="danger-alert" style={{
              backgroundColor: getDangerColor(selectedPin.danger_level)
            }}>
              ⚠️ {selectedPin.report_count} Report{selectedPin.report_count > 1 ? 's' : ''} • {selectedPin.danger_level.toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

