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
            switch (error.code) {
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
      // Bypass for Test Beach bins
      if (data.beach_id === 'test_beach_location') {
        console.log('Test Beach bin - Bypassing location verification')
        // Mock success
      } else {
        const distance = getDistance(userLat, userLng, data.gps_lat, data.gps_lng)
        if (distance > 10) {
          setError(`You must be within 10m of the bin. Current distance: ${distance.toFixed(1)}m`)
          return
        }
      }

      setBinData(data)
      setMessage(`✅ Bin ${data.bin_id} verified! Current status: ${data.status.toUpperCase()}`)

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

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return Math.round(R * c * 100) / 100 // Round to 2 decimal places for precision
  }

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
    }
  }

  const handleBinStatusReport = async (newStatus) => {
    if (!binData) {
      setError('Please scan QR code first')
      return
    }

    setLoading(true)
    setError('')

    try {
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

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude

      let imageUrl = null
      if (photo) {
        imageUrl = await uploadImage(photo)
      }

      // Update bin status if reporting full for first time
      if (newStatus === 'full' && binData.status !== 'full') {
        await supabase
          .from('bins')
          .update({
            status: 'full',
            last_reported_time: new Date().toISOString(),
            last_reported_by: user.id
          })
          .eq('bin_id', binData.bin_id)

        // Notify municipality
        await sendTelegramAlert('bin_full', {
          binId: binData.bin_id,
          lat: userLat,
          lng: userLng,
          description: `Bin ${binData.bin_id} reported as FULL - needs emptying`
        })
      }

      // Create report with live location tracking
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          bin_id: binData.bin_id,
          type: 'bin',
          status: 'pending',
          gps_lat: userLat,
          gps_lng: userLng,
          image_before_url: imageUrl,
          description: `Bin status: ${newStatus} - Live location verified (Accuracy: ${position.coords.accuracy}m)`,
          coins_awarded: newStatus === 'full' ? 5 : 10
        })

      if (reportError) throw reportError

      // Award coins
      const coinsAwarded = newStatus === 'full' ? 5 : 10
      await supabase.rpc('increment_coins', {
        user_id_param: user.id,
        coins_param: coinsAwarded
      })

      setMessage(`✅ ${newStatus === 'full' ? 'Bin reported as full!' : 'Cleanup verified!'} You earned ${coinsAwarded} coins!`)
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
        <QRScanner onScan={handleQRScan} scannerId="bin-scanner" />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => handleBinStatusReport('full')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Reporting...' : '🗑️ Report Bin as FULL (+5 coins)'}
          </button>
          <button
            onClick={() => handleBinStatusReport('cleaned')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verifying...' : '✅ Verify Cleanup/Disposal (+10 coins)'}
          </button>
        </div>
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
          <li>Report bin as FULL (+5 coins) - notifies municipality</li>
          <li>OR verify cleanup/disposal (+10 coins)</li>
          <li>Optional: Add photo evidence</li>
          <li>Municipality gets notified when bins are full</li>
          <li>Municipality manually updates status after clearing</li>
        </ul>
      </div>
    </div>
  )
}

