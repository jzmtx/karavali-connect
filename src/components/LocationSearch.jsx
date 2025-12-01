import { useState, useEffect, useRef } from 'react'
import Input from './ui/Input'

export default function LocationSearch({ onLocationSelect, placeholder = "Search beach location..." }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  const searchLocation = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`
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
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="mb-0"
          rightIcon={loading ? <span className="animate-spin">🔄</span> : <span>🔍</span>}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-slide-up">
          {suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(location)}
              className="w-full text-left p-3 hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors flex items-center gap-3 group"
            >
              <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                📍
              </div>
              <div>
                <div className="font-semibold text-white text-sm">
                  {location.name}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[250px]">
                  {location.fullName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}