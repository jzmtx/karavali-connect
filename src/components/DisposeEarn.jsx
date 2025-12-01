import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadImage } from '../services/cloudinary'
import { config } from '../lib/config'
import QRScanner from './QRScanner'

export default function DisposeEarn({ user, onUpdate }) {
  const [qrCode, setQrCode] = useState('')
  const [binData, setBinData] = useState(null)
  const [handPhoto, setHandPhoto] = useState(null)
  const [binPhoto, setBinPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastDispose, setLastDispose] = useState(null)

  useEffect(() => {
    // Check last dispose time
    const lastTime = localStorage.getItem(`lastDispose_${user.id}`)
    if (lastTime) {
      setLastDispose(new Date(lastTime))
    }
  }, [user])

  const handleQRScan = async (scannedCode) => {
    setQrCode(scannedCode)
    setError('')
    setMessage('')

    // Check cooldown
    if (lastDispose) {
      const now = new Date()
      const diff = now - lastDispose
      if (diff < config.disposeCooldown) {
        const minutesLeft = Math.ceil((config.disposeCooldown - diff) / (1000 * 60))
        setError(`Please wait ${minutesLeft} minute(s) before disposing again.`)
        return
      }
    }

    const { data, error: binError } = await supabase
      .from('bins')
      .select('*')
      .eq('qr_code', scannedCode)
      .single()

    if (binError || !data) {
      setError('Bin not found. Please scan a valid QR code.')
      return
    }

    setBinData(data)
    setMessage('Bin found! Take photos to earn coins.')
  }

  const handleSubmit = async () => {
    if (!binData || !handPhoto || !binPhoto) {
      setError('Please scan QR code and take both photos')
      return
    }

    setLoading(true)
    setError('')

    try {
      let userLat = 0
      let userLng = 0
      let accuracy = 0
      let distance = 0

      // Bypass location check for Test Beach bins
      if (binData.beach_id === 'test_beach_location') {
        console.log('Test Beach bin - Bypassing location verification')
        userLat = binData.gps_lat
        userLng = binData.gps_lng
        accuracy = 10
        distance = 0
      } else {
        // Get live location with high accuracy
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }
          )
        })

        userLat = position.coords.latitude
        userLng = position.coords.longitude
        accuracy = position.coords.accuracy

        // Verify GPS
        distance = getDistance(userLat, userLng, binData.gps_lat, binData.gps_lng)
        if (distance > config.gpsAccuracy) {
          setError(`You must be within ${config.gpsAccuracy}m of the bin.`)
          setLoading(false)
          return
        }
      }

      // Upload photos
      const handUrl = await uploadImage(handPhoto)
      const binUrl = await uploadImage(binPhoto)

      // Create report with live location tracking
      await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          bin_id: binData.bin_id,
          type: 'dispose',
          status: 'verified',
          gps_lat: userLat,
          gps_lng: userLng,
          image_before_url: handUrl,
          image_after_url: binUrl,
          coins_awarded: 5,
          description: `Live location verified - Accuracy: ${accuracy}m, Distance to bin: ${distance.toFixed(1)}m`
        })

      // Award coins
      await supabase.rpc('increment_coins', {
        user_id_param: user.id,
        coins_param: 5
      })

      // Update last dispose time
      localStorage.setItem(`lastDispose_${user.id}`, new Date().toISOString())
      setLastDispose(new Date())

      setMessage('✅ Disposal verified! You earned 5 coins!')
      setBinData(null)
      setHandPhoto(null)
      setBinPhoto(null)
      setQrCode('')
      onUpdate()

    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
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

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>♻️ Dispose & Earn</h2>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          background: '#d1fae5',
          color: '#065f46',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Scan QR Code on Bin
        </label>
        <QRScanner onScan={handleQRScan} scannerId="dispose-scanner" />
      </div>

      {binData && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Photo 1: Trash in Hand
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setHandPhoto(e.target.files[0])}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px'
              }}
            />
            {handPhoto && (
              <img
                src={URL.createObjectURL(handPhoto)}
                alt="Hand"
                style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', objectFit: 'cover' }}
              />
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Photo 2: Trash in Bin
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setBinPhoto(e.target.files[0])}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px'
              }}
            />
            {binPhoto && (
              <img
                src={URL.createObjectURL(binPhoto)}
                alt="Bin"
                style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', objectFit: 'cover' }}
              />
            )}
          </div>
        </>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !binData || !handPhoto || !binPhoto}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: loading || !binData || !handPhoto || !binPhoto ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading || !binData || !handPhoto || !binPhoto ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Submitting...' : 'Submit (+5 Coins)'}
      </button>

      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#eff6ff',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        <strong>💡 How it works:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Scan QR code on bin</li>
          <li>Take photo of trash in your hand</li>
          <li>Take photo of trash in the bin</li>
          <li>Earn 5 coins instantly</li>
          <li>10-minute cooldown between disposals</li>
        </ul>
      </div>
    </div>
  )
}

