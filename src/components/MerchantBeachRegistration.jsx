import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LocationSearch from './LocationSearch'

export default function MerchantBeachRegistration({ user, onRegistrationComplete }) {
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [description, setDescription] = useState('')
  const [businessImage, setBusinessImage] = useState(null)
  const [selectedBeach, setSelectedBeach] = useState('')
  const [shopLocation, setShopLocation] = useState(null)
  const [beaches, setBeaches] = useState([])
  const [filteredBeaches, setFilteredBeaches] = useState([])
  const [beachSearch, setBeachSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [beachesLoading, setBeachesLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [registeredBeach, setRegisteredBeach] = useState(null)
  const [showManualBeachEntry, setShowManualBeachEntry] = useState(false)
  const [manualBeachName, setManualBeachName] = useState('')

  useEffect(() => {
    checkExistingRegistration()
    loadBeaches()
  }, [user])

  const loadBeaches = async () => {
    setBeachesLoading(true)
    try {
      const { data, error } = await supabase
        .from('beaches')
        .select('beach_id, name, district')
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      setBeaches(data || [])
      setFilteredBeaches(data || [])
    } catch (err) {
      console.error('Error loading beaches:', err)
      setError('Unable to load beaches. You can search or enter manually.')
    } finally {
      setBeachesLoading(false)
    }
  }

  const handleBeachSearch = (term) => {
    setBeachSearch(term)
    if (!term.trim()) {
      setFilteredBeaches(beaches)
    } else {
      const filtered = beaches.filter(beach => 
        beach.name.toLowerCase().includes(term.toLowerCase()) ||
        beach.district.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredBeaches(filtered)
    }
  }

  const handleManualBeachEntry = () => {
    if (!manualBeachName.trim()) return
    
    const manualBeachId = manualBeachName.toLowerCase().replace(/\s+/g, '_')
    setSelectedBeach(manualBeachId)
    setMessage(`Manual beach entry: ${manualBeachName}`)
    setShowManualBeachEntry(false)
    setManualBeachName('')
  }

  const checkExistingRegistration = async () => {
    try {
      const { data, error } = await supabase
        .from('beach_merchants')
        .select(`
          *,
          beaches!beach_merchants_beach_id_fkey(name, district)
        `)
        .eq('merchant_id', user.id)
        .eq('is_active', true)
        .single()

      if (data) {
        setRegisteredBeach(data)
        setBusinessName(data.business_name)
        setBusinessType(data.business_type)
        setShopAddress(data.shop_address || '')
        setContactPhone(data.contact_phone || '')
        setDescription(data.description || '')
        setSelectedBeach(data.beach_id)
        if (data.shop_gps_lat && data.shop_gps_lng) {
          setShopLocation({ lat: data.shop_gps_lat, lng: data.shop_gps_lng })
        }
      }
    } catch (err) {
      // No existing registration found
    }
  }

  const getShopLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      })
      
      setShopLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
      setMessage('📍 Shop location captured!')
    } catch (err) {
      setError('Unable to get location. Please try again or enter manually.')
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setBusinessImage(file)
    }
  }

  const handleRegistration = async () => {
    if (!businessName.trim() || !businessType.trim() || !selectedBeach || !shopAddress.trim()) {
      setError('Business name, type, beach, and shop address are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      let imageUrl = null
      
      // Upload business image if provided
      if (businessImage) {
        const formData = new FormData()
        formData.append('file', businessImage)
        formData.append('upload_preset', 'karavali-connect')
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/dn7irsiva/image/upload`,
          { method: 'POST', body: formData }
        )
        const result = await response.json()
        imageUrl = result.secure_url
      }

      // For manual entries, create beach record if it doesn't exist
      if (!beaches.find(b => b.beach_id === selectedBeach)) {
        const beachName = selectedBeach.replace(/_/g, ' ')
        const { error: beachError } = await supabase
          .from('beaches')
          .upsert({
            beach_id: selectedBeach,
            name: beachName,
            district: 'Manual Entry',
            gps_lat: shopLocation?.lat || 0,
            gps_lng: shopLocation?.lng || 0,
            status: 'active'
          })
        
        if (beachError) console.warn('Beach creation warning:', beachError)
      }

      // Register merchant shop
      let data, error
      try {
        const result = await supabase
          .rpc('register_merchant_shop', {
            merchant_id_param: user.id,
            beach_id_param: selectedBeach,
            business_name_param: businessName.trim(),
            business_type_param: businessType.trim(),
            shop_address_param: shopAddress.trim(),
            shop_lat: shopLocation?.lat || null,
            shop_lng: shopLocation?.lng || null,
            contact_phone_param: contactPhone.trim() || null,
            business_image_param: imageUrl,
            description_param: description.trim() || null
          })
        data = result.data
        error = result.error
      } catch (funcError) {
        // Fallback: Direct table insert if function doesn't exist
        const result = await supabase
          .from('beach_merchants')
          .upsert({
            merchant_id: user.id,
            beach_id: selectedBeach,
            business_name: businessName.trim(),
            business_type: businessType.trim(),
            shop_address: shopAddress.trim(),
            shop_gps_lat: shopLocation?.lat || null,
            shop_gps_lng: shopLocation?.lng || null,
            contact_phone: contactPhone.trim() || null,
            business_image_url: imageUrl,
            description: description.trim() || null,
            is_active: true
          }, {
            onConflict: 'merchant_id,beach_id'
          })
        
        if (result.error) throw result.error
        data = { success: true, beach_name: selectedBeach.replace(/_/g, ' ') }
        error = null
      }

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error)
      }

      const beachName = data.beach_name || selectedBeach.replace(/_/g, ' ')
      setMessage(`✅ Successfully registered shop at ${beachName}!`)
      setRegisteredBeach({
        beach_id: selectedBeach,
        beaches: { name: beachName }
      })
      
      if (onRegistrationComplete) {
        onRegistrationComplete(data)
      }

    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const businessTypes = [
    'Restaurant',
    'Cafe',
    'Water Sports',
    'Souvenir Shop',
    'Beach Shack',
    'Hotel',
    'Rental Service',
    'Tour Operator',
    'Other'
  ]

  return (
    <div style={{
      background: 'var(--glass-bg)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid var(--glass-border)',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>
        🏖️ Beach Business Registration
      </h3>

      {registeredBeach && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ color: 'rgb(134, 239, 172)', fontWeight: '600', marginBottom: '0.5rem' }}>
            ✅ Registered at {registeredBeach.beaches?.name}
          </div>
          <div style={{ color: 'rgba(134, 239, 172, 0.8)', fontSize: '0.875rem' }}>
            Business: {registeredBeach.business_name} ({registeredBeach.business_type})
          </div>
        </div>
      )}

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

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Beach Location *
          </label>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search beaches..."
            value={beachSearch}
            onChange={(e) => handleBeachSearch(e.target.value)}
            className="form-input"
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          
          {/* Beach Dropdown */}
          <select
            value={selectedBeach}
            onChange={(e) => setSelectedBeach(e.target.value)}
            className="form-input"
            style={{ width: '100%', marginBottom: '0.5rem' }}
            disabled={beachesLoading}
          >
            <option value="">
              {beachesLoading ? 'Loading beaches...' : 'Select beach'}
            </option>
            {filteredBeaches.map(beach => (
              <option key={beach.beach_id} value={beach.beach_id}>
                {beach.name}, {beach.district}
              </option>
            ))}
          </select>
          
          {/* Manual Entry Option */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowManualBeachEntry(!showManualBeachEntry)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
            >
              🔍 Location Search
            </button>
            {selectedBeach && !beaches.find(b => b.beach_id === selectedBeach) && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                Manual entry: {selectedBeach.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          
          {/* Manual Entry Form */}
          {showManualBeachEntry && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px'
            }}>
              <h5 style={{ color: 'rgb(134, 239, 172)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                🔍 Search Beach Location
              </h5>
              <div style={{ marginBottom: '0.75rem' }}>
                <LocationSearch
                  placeholder="Search beach location..."
                  onLocationSelect={(location) => {
                    setSelectedBeach(location.name.toLowerCase().replace(/\s+/g, '_'))
                    setMessage(`📍 Selected: ${location.name}`)
                    setShowManualBeachEntry(false)
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
                  onKeyPress={(e) => e.key === 'Enter' && handleManualBeachEntry()}
                  className="form-input"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                />
                <button
                  type="button"
                  onClick={handleManualBeachEntry}
                  disabled={!manualBeachName.trim()}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: manualBeachName.trim() ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '6px',
                    color: 'rgb(134, 239, 172)',
                    fontSize: '0.75rem',
                    cursor: manualBeachName.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  ✅ Use
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Business Name *
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Malpe Beach Cafe"
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Business Type *
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="form-input"
            style={{ width: '100%' }}
          >
            <option value="">Select business type</option>
            {businessTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Shop Address *
          </label>
          <textarea
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
            placeholder="Full address of your shop/business location"
            className="form-input"
            style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Shop Location (GPS)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={getShopLocation}
              className="btn btn-secondary"
              style={{ whiteSpace: 'nowrap' }}
            >
              📍 Get Location
            </button>
            {shopLocation && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                {shopLocation.lat.toFixed(6)}, {shopLocation.lng.toFixed(6)}
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Contact Phone
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="9876543210"
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Business Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="form-input"
            style={{ width: '100%' }}
          />
          {businessImage && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={URL.createObjectURL(businessImage)}
                alt="Business preview"
                style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your business..."
            className="form-input"
            style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={handleRegistration}
          disabled={loading || !businessName.trim() || !businessType.trim() || !selectedBeach || !shopAddress.trim()}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {loading ? 'Registering...' : registeredBeach ? 'Update Registration' : 'Register at Current Beach'}
        </button>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'rgb(147, 197, 253)'
      }}>
        💡 <strong>Note:</strong> You can register your shop at any beach location. 
        Customers visiting that beach will be able to find and redeem coins at your business.
      </div>
    </div>
  )
}