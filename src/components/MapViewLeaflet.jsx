import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'
import BeachConditions from './BeachConditions'

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapViewLeaflet({ user, selectedBeach, onBeachSelect }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const [safetyPins, setSafetyPins] = useState([])
  const [mapError, setMapError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [internalSelectedBeach, setInternalSelectedBeach] = useState(null)

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = () => {
      if (!mapContainer.current || map.current) return

      try {
        map.current = L.map(mapContainer.current, {
          zoomControl: false
        }).setView([13.35, 74.7], 12)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map.current)

        L.control.zoom({
          position: 'topright'
        }).addTo(map.current)

        setTimeout(() => {
          if (map.current) {
            map.current.invalidateSize()
          }
        }, 200)

        // Load initial data
        loadSafetyPins()

        // Map Click Handler
        map.current.on('click', async (e) => {
          const { lat, lng } = e.latlng

          // Check if clicked near an existing pin
          const nearbyPin = safetyPins.find(pin => {
            const distance = getDistance(lat, lng, pin.gps_lat, pin.gps_lng)
            return distance < 0.001 // Approx 100m
          })

          if (nearbyPin) {
            handlePinSelect(nearbyPin)
          } else {
            // Treat as new location selection
            const newLocation = {
              beach_id: `loc_${lat.toFixed(4)}_${lng.toFixed(4)}`,
              name: 'Selected Location',
              district: 'Custom Selection',
              gps_lat: lat,
              gps_lng: lng,
              is_custom: true
            }
            handleExternalSelect(newLocation)
          }
        })

      } catch (error) {
        console.error('Error initializing map:', error)
        setMapError('Failed to load map. Please refresh the page.')
      }
    }

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

  // Sync Markers with Safety Pins
  useEffect(() => {
    if (!map.current || !safetyPins.length) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    safetyPins.forEach(pin => {
      const marker = L.marker([pin.gps_lat, pin.gps_lng])
        .addTo(map.current)
        .bindPopup(`
          <div style="padding: 0.5rem; color: #000;">
            <strong>${pin.danger_level.toUpperCase()} Danger</strong><br/>
            Reports: ${pin.report_count}
          </div>
        `)

      marker.on('click', () => {
        handlePinSelect(pin)
      })

      markersRef.current.push(marker)
    })
  }, [safetyPins])

  // Sync Map View with Selected Beach Prop (External Update)
  useEffect(() => {
    if (map.current && selectedBeach) {
      map.current.flyTo([selectedBeach.gps_lat, selectedBeach.gps_lng], 15, {
        duration: 1.5
      })
      setInternalSelectedBeach(selectedBeach)
    }
  }, [selectedBeach])

  const loadSafetyPins = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_pins')
        .select('*')
        .order('report_count', { ascending: false })
        .limit(50)

      if (error) throw error
      if (data) setSafetyPins(data)
    } catch (error) {
      console.error('Error loading safety pins:', error)
    }
  }

  const handlePinSelect = (pin) => {
    const beachData = {
      beach_id: pin.id || `pin_${pin.gps_lat}_${pin.gps_lng}`,
      name: pin.location_name || 'Safety Report Location',
      district: 'Map Selection',
      gps_lat: pin.gps_lat,
      gps_lng: pin.gps_lng,
      danger_level: pin.danger_level,
      report_count: pin.report_count
    }
    handleExternalSelect(beachData)
  }

  const handleExternalSelect = (beachData) => {
    setInternalSelectedBeach(beachData)
    if (onBeachSelect) {
      onBeachSelect(beachData)
    }
  }

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      // Relaxed query: search for exactly what the user typed, restricted to India
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`
      )
      const data = await response.json()
      const results = data.map(item => ({
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }))
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const goToLocation = (lat, lng, name) => {
    if (map.current) {
      map.current.setView([lat, lng], 15)
      L.marker([lat, lng])
        .addTo(map.current)
        .bindPopup(`📍 ${name}`)
        .openPopup()

      const beachData = {
        beach_id: `search_${lat}_${lng}`,
        name: name,
        district: 'Search Result',
        gps_lat: lat,
        gps_lng: lng
      }
      handleExternalSelect(beachData)
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        if (map.current) {
          map.current.setView([latitude, longitude], 15)
          L.marker([latitude, longitude])
            .addTo(map.current)
            .bindPopup('📍 Your Location')
            .openPopup()

          handleExternalSelect({
            beach_id: 'current_location',
            name: 'Current Location',
            district: 'GPS',
            gps_lat: latitude,
            gps_lng: longitude
          })
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
      },
      { enableHighAccuracy: true }
    )
  }

  if (mapError) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-400 mb-4">{mapError}</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-xl overflow-hidden bg-black/20">
      {/* Search Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 max-w-xs">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            🔍
          </div>
          <input
            type="text"
            placeholder="Search map..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              searchLocation(e.target.value)
            }}
            className="w-full pl-10 pr-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm shadow-lg"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-60 overflow-y-auto p-2 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => goToLocation(result.lat, result.lng, result.name)}
                className="w-full text-left p-2 hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors group"
              >
                <span className="text-lg">📍</span>
                <div>
                  <div className="font-medium text-white text-sm">{result.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{result.fullName}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full z-0"
        style={{ minHeight: '600px' }}
      />

      {/* My Location Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={getCurrentLocation}
          className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors shadow-lg"
          title="My Location"
        >
          📍
        </button>
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-2">
          <div className="space-y-1 text-[10px] text-white font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span> Safe
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span> Caution
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span> Danger
            </div>
          </div>
        </div>
      </div>

      {/* Selected Location Info & Conditions Overlay */}
      {internalSelectedBeach && (
        <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 z-[1000]">
          <div className="bg-black/80 backdrop-blur-xl border border-red-500/30 shadow-2xl rounded-xl p-4 animate-slide-up">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-white text-sm">{internalSelectedBeach.name}</h3>
                <p className="text-[10px] text-gray-400">{internalSelectedBeach.district}</p>
              </div>
              <button
                onClick={() => setInternalSelectedBeach(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Integrated Conditions - Compact Mode */}
            <div className="mt-2">
              <BeachConditions selectedBeach={internalSelectedBeach} compact={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
