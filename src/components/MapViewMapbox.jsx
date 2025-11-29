import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { config } from '../lib/config'
import { getMarineWeather } from '../services/weather'
import { supabase } from '../lib/supabase'

export default function MapViewMapbox({ user }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [safetyPins, setSafetyPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = () => {
      if (!mapContainer.current || map.current) return

      try {
        mapboxgl.accessToken = config.mapboxToken

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [74.7, 13.35], // Malpe, Karnataka
          zoom: 12
        })

        map.current.addControl(new mapboxgl.NavigationControl())

        // Wait for map to load
        map.current.on('load', () => {
          if (map.current) {
            map.current.resize()
          }
        })
      } catch (error) {
        console.error('Error initializing Mapbox:', error)
      }
    }

    if (mapContainer.current.offsetWidth > 0) {
      initMap()
    } else {
      setTimeout(initMap, 100)
    }

    // Load safety pins
    loadSafetyPins()

    // Handle map clicks for danger reporting
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      
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

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!map.current || !safetyPins.length) return

    // Add markers for safety pins
    safetyPins.forEach(pin => {
      const el = document.createElement('div')
      el.className = 'safety-marker'
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.background = getDangerColor(pin.danger_level)
      el.style.border = '2px solid white'
      el.style.cursor = 'pointer'

      new mapboxgl.Marker(el)
        .setLngLat([pin.gps_lng, pin.gps_lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="padding: 0.5rem;">
            <strong>${pin.danger_level.toUpperCase()} Danger</strong><br/>
            Reports: ${pin.report_count}
          </div>
        `))
        .addTo(map.current)
    })
  }, [safetyPins])

  const loadSafetyPins = async () => {
    const { data } = await supabase
      .from('safety_pins')
      .select('*')
      .order('report_count', { ascending: false })
      .limit(50)

    if (data) {
      setSafetyPins(data)
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

  return (
    <div>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '500px', 
          borderRadius: '8px', 
          overflow: 'hidden',
          minHeight: '500px',
          position: 'relative',
          zIndex: 0
        }} 
      />

      {selectedPin && (
        <div style={{
          marginTop: '1rem',
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>📍 Location Safety</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            {selectedPin.gps_lat.toFixed(6)}, {selectedPin.gps_lng.toFixed(6)}
          </p>

          {weather && (
            <div style={{
              background: '#f3f4f6',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ marginBottom: '0.5rem' }}>🌊 Marine Weather</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <strong>Wave Height:</strong> {weather.waveHeight?.toFixed(2) || 'N/A'}m
                </div>
                <div>
                  <strong>Wind Speed:</strong> {weather.windSpeed?.toFixed(1) || 'N/A'} km/h
                </div>
              </div>
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: weather.isSafe ? '#d1fae5' : '#fee2e2',
                color: weather.isSafe ? '#065f46' : '#991b1b',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {weather.isSafe ? '✅ Safe Conditions' : '⚠️ Unsafe Conditions'}
              </div>
            </div>
          )}

          {selectedPin.report_count > 0 && (
            <div style={{
              padding: '0.75rem',
              background: getDangerColor(selectedPin.danger_level),
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {selectedPin.report_count} Report{selectedPin.report_count > 1 ? 's' : ''} • {selectedPin.danger_level.toUpperCase()} Risk
            </div>
          )}
        </div>
      )}
    </div>
  )
}

