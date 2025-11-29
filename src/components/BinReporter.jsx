import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadImage } from '../services/cloudinary'
import { sendTelegramAlert } from '../services/telegram'
import { config } from '../lib/config'
import QRScanner from './QRScanner'

export default function BinReporter({ user, onUpdate }) {
  const [qrCode, setQrCode] = useState('')
  const [binData, setBinData] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleQRScan = async (scannedCode) => {
    setQrCode(scannedCode)
    setError('')
    setMessage('')

    try {
      // Get user location with proper error handling
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'))
          return
        }
        
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            switch(error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('Location access denied. Please enable location permissions.'))
                break
              case error.POSITION_UNAVAILABLE:
                reject(new Error('Location information unavailable. Please try again.'))
                break
              case error.TIMEOUT:
                reject(new Error('Location request timed out. Please try again.'))
                break
              default:
                reject(new Error('An unknown error occurred while retrieving location.'))
                break
            }
          },
          { timeout: 10000, enableHighAccuracy: true }
        )
      })

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude

      // Find bin by QR code
      const { data, error: binError } = await supabase
        .from('bins')
        .select('*')
        .eq('qr_code', scannedCode)
        .single()

      if (binError || !data) {
        setError('Bin not found. Please scan a valid QR code.')
        return
      }

      // Verify GPS location (must be within 10 meters)
      const distance = getDistance(userLat, userLng, data.gps_lat, data.gps_lng)
      if (distance > config.gpsAccuracy) {
        setError(`You must be within ${config.gpsAccuracy}m of the bin. Current distance: ${distance.toFixed(1)}m`)
        return
      }

      // Check if user already scanned this bin today (UTC)
      const todayUTC = new Date()
      todayUTC.setUTCHours(0, 0, 0, 0)
      
      const { data: existingScans } = await supabase
        .from('bin_qr_scans')
        .select('*')
        .eq('bin_id', data.bin_id)
        .eq('user_id', user.id)
        .gte('scanned_at', todayUTC.toISOString())

      if (existingScans && existingScans.length > 0) {
        setMessage('✅ You already scanned this bin today! Coins already awarded.')
        setBinData(data)
        return
      }

      // Use atomic transaction function
      const { data: scanResult, error: scanError } = await supabase
        .rpc('process_qr_scan', {
          bin_id_param: data.bin_id,
          user_id_param: user.id,
          scan_lat: userLat,
          scan_lng: userLng,
          coins_param: 10
        })

      if (scanError) {
        throw new Error(`QR scan processing failed: ${scanError.message}`)
      }

      if (!scanResult.success) {
        throw new Error(scanResult.error)
      }

      setBinData(data)
      setMessage('✅ Bin verified! You earned 10 coins instantly!')
      onUpdate()
    } catch (err) {
      console.error('QR scan error:', err)
      setError(err.message || 'Failed to verify bin QR code')
    }
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return Math.round(R * c * 100) / 100 // Round to 2 decimal places for precision
  }

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
    }
  }

  // Note: Photo submission is now optional since QR scan verifies automatically
  const handleSubmit = async () => {
    if (!binData) {
      setError('Please scan QR code first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get user's current location with proper error handling
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'))
          return
        }
        
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            switch(error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('Location access denied. Please enable location permissions.'))
                break
              case error.POSITION_UNAVAILABLE:
                reject(new Error('Location information unavailable. Please try again.'))
                break
              case error.TIMEOUT:
                reject(new Error('Location request timed out. Please try again.'))
                break
              default:
                reject(new Error('An unknown error occurred while retrieving location.'))
                break
            }
          },
          { timeout: 10000, enableHighAccuracy: true }
        )
      })

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude

      let imageUrl = null
      if (photo) {
        // Upload photo if provided
        imageUrl = await uploadImage(photo)
      }

      // Create report (optional - for photo evidence)
      if (imageUrl) {
        await supabase
          .from('reports')
          .insert({
            user_id: user.id,
            bin_id: binData.bin_id,
            type: 'bin',
            status: 'verified', // Already verified by QR scan
            gps_lat: userLat,
            gps_lng: userLng,
            image_before_url: imageUrl,
            coins_awarded: 10
          })

        // Send Telegram alert
        await sendTelegramAlert('bin', {
          lat: userLat,
          lng: userLng,
          imageUrl: imageUrl,
          description: `Bin verified via QR scan at ${binData.bin_id}`
        })
      }

      setMessage('✅ Bin verified and coins awarded! Photo submitted for record.')
      setBinData(null)
      setPhoto(null)
      setQrCode('')
      onUpdate()

    } catch (err) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
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
      <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>🗑️ Scan Bin QR Code</h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
        Scan the QR code on the bin to verify and earn 10 coins instantly!
      </p>

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
        <QRScanner onScan={handleQRScan} />
      </div>

      {binData && (
        <div style={{
          background: '#d1fae5',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '2px solid #10b981'
        }}>
          <p style={{ fontWeight: '600', color: '#065f46', marginBottom: '0.5rem' }}>
            ✅ Bin Verified: {binData.bin_id}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#047857' }}>
            Status: {binData.status} • Coins awarded instantly!
          </p>
        </div>
      )}

      {binData && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Optional: Take Photo for Record
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px'
            }}
          />
          {photo && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={URL.createObjectURL(photo)}
                alt="Preview"
                style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      )}

      {binData && (
        <button
          onClick={handleSubmit}
          disabled={loading || !binData}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: loading || !binData ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading || !binData ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Submitting...' : 'Submit Photo (Optional)'}
        </button>
      )}

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
          <li>Scan QR code on the bin (must be within 10m)</li>
          <li>System verifies bin and location automatically</li>
          <li>Earn 10 coins instantly (verified by QR scan)</li>
          <li>Optional: Add photo for record keeping</li>
          <li>One scan per bin per day maximum</li>
        </ul>
      </div>
    </div>
  )
}

