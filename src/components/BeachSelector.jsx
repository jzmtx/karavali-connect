import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import LocationSearch from './LocationSearch'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [externalSearchResults, setExternalSearchResults] = useState([])
  const [isSearchingExternal, setIsSearchingExternal] = useState(false)

  const dropdownRef = useRef(null)

  useEffect(() => {
    loadAllBeaches()
    getCurrentLocationAndBeaches()

    // Click outside listener
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedBeach) {
      setSearchTerm(selectedBeach.name)
      setMessage(`✅ Selected: ${selectedBeach.name}`)
    } else {
      setSearchTerm('')
      setMessage('')
    }
  }, [selectedBeach])

  const getCurrentLocationAndBeaches = async () => {
    setLoading(true)
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
      setUserLocation({ lat, lng })

      const { data: detectionResult } = await supabase
        .rpc('detect_user_beach', {
          user_lat: lat,
          user_lng: lng
        })

      if (detectionResult?.detected) {
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
    } catch (err) {
      setError('Location not available. Please select from list.')
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
      setError('Unable to load beaches.')
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
    setSearchTerm(beach.name)
    setIsDropdownOpen(false)
  }

  const handleClearSelection = () => {
    onBeachSelect(null)
    setSearchTerm('')
    setMessage('')
    setFilteredBeaches(nearbyBeaches)
    setExternalSearchResults([])
  }

  const searchExternalLocations = async (term) => {
    if (!term || term.length < 3) return

    setIsSearchingExternal(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=5&countrycodes=in`
      )
      const data = await response.json()

      const results = data.map(item => ({
        beach_id: `ext_${item.place_id}`,
        name: item.display_name.split(',')[0],
        district: 'External Search',
        full_name: item.display_name,
        gps_lat: parseFloat(item.lat),
        gps_lng: parseFloat(item.lon),
        is_external: true
      }))

      setExternalSearchResults(results)
    } catch (error) {
      console.error('External search failed:', error)
    } finally {
      setIsSearchingExternal(false)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    setIsDropdownOpen(true)

    // Filter local beaches
    if (!term.trim()) {
      setFilteredBeaches(nearbyBeaches)
      setExternalSearchResults([])
    } else {
      const filtered = nearbyBeaches.filter(beach =>
        beach.name.toLowerCase().includes(term.toLowerCase()) ||
        beach.district.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredBeaches(filtered)

      // Trigger external search if few local results or user keeps typing
      if (term.length > 2) {
        // Debounce external search could be better, but for now direct call
        const timeoutId = setTimeout(() => searchExternalLocations(term), 500)
        return () => clearTimeout(timeoutId)
      }
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

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Main Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-xl">🏖️</span>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search beaches or locations..."
          className="w-full pl-12 pr-32 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all shadow-lg text-lg"
        />

        {/* Action Buttons inside Input */}
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              onClick={handleClearSelection}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white mr-1"
              title="Clear Selection"
            >
              ✕
            </button>
          )}

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          <button
            onClick={getCurrentLocationAndBeaches}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400"
            title="Auto-detect Location"
          >
            {loading ? <span className="animate-spin">🔄</span> : '📍'}
          </button>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-green-400"
            title="Manual Entry"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-slide-up">
          {filteredBeaches.length === 0 && externalSearchResults.length === 0 && !isSearchingExternal ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🌊</div>
              <p>No beaches found matching "{searchTerm}"</p>
              <p className="text-xs mt-2 text-gray-500">Try typing a city name...</p>
            </div>
          ) : (
            <div className="p-2 grid gap-1">
              {/* Local Beaches Section */}
              {filteredBeaches.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Registered Beaches</div>
                  {filteredBeaches.map((beach) => (
                    <button
                      key={beach.beach_id}
                      onClick={() => handleBeachSelect(beach)}
                      className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-all ${selectedBeach?.beach_id === beach.beach_id
                        ? 'bg-red-900/30 border border-red-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedBeach?.beach_id === beach.beach_id ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 group-hover:text-white'
                          }`}>
                          🏝️
                        </div>
                        <div>
                          <div className="font-semibold text-white">{beach.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <span>📍 {beach.district}</span>
                            {beach.distance_km && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>{beach.distance_km} km away</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedBeach?.beach_id === beach.beach_id && (
                        <span className="text-red-500 font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* External Search Results Section */}
              {externalSearchResults.length > 0 && (
                <>
                  <div className="mt-2 px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider border-t border-white/10 pt-2">Other Locations</div>
                  {externalSearchResults.map((location) => (
                    <button
                      key={location.beach_id}
                      onClick={() => handleBeachSelect(location)}
                      className="w-full text-left p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 border border-transparent transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white">
                          📍
                        </div>
                        <div>
                          <div className="font-semibold text-white">{location.name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{location.full_name}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {isSearchingExternal && (
                <div className="p-4 text-center text-gray-500 text-sm animate-pulse">
                  Searching other locations...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Panel */}
      {showManualEntry && (
        <div className="mt-4 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl animate-fade-in">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            ✏️ Manual Entry
            <span className="text-xs font-normal text-gray-400 ml-auto">Search for any location</span>
          </h4>

          <LocationSearch
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
              setSearchTerm(location.name)
              setShowManualEntry(false)
            }}
          />

          <div className="mt-3 flex items-center gap-2">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-gray-500">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Input
              value={manualBeachName}
              onChange={(e) => setManualBeachName(e.target.value)}
              placeholder="Type name directly..."
              className="mb-0"
            />
            <Button
              onClick={handleManualBeachSelect}
              disabled={!manualBeachName.trim()}
              variant="primary"
            >
              Set
            </Button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {(message || error) && (
        <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in ${error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}>
          <span>{error ? '⚠️' : '✅'}</span>
          {error || message}
        </div>
      )}
    </div>
  )
}