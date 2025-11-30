import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadImage } from '../services/cloudinary'
import { sendTelegramAlert } from '../services/telegram'
import { activityVerificationService } from '../services/activityVerificationService'

export default function SafetyReport({ user, selectedBeach }) {
  const [reportType, setReportType] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const getLocation = async () => {
    try {
      const position = await activityVerificationService.getCurrentGPS()
      setLocation({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        speed: 0
      })
    } catch (err) {
      setError(err.message || 'Failed to get location. Please enable GPS.')
    }
  }

  useEffect(() => {
    getLocation()
  }, [])

  const handleSubmit = async () => {
    if (!reportType || !location) {
      setError('Please select report type and allow location access')
      return
    }

    if (!selectedBeach) {
      setError('Please select a beach first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify real-time GPS location for safety report
      const verification = await activityVerificationService.verifyActivityLocation(
        user.id,
        selectedBeach.beach_id,
        'safety_report'
      )

      const verificationResult = activityVerificationService.formatVerificationResult(verification)
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.message)
      }

      // Check GPS accuracy
      if (!activityVerificationService.isAccuracySufficient(verification.accuracy, 'safety_report')) {
        throw new Error(`GPS accuracy too low (${Math.round(verification.accuracy)}m). Please wait for better signal or move to open area.`)
      }

      // Use verified location
      const verifiedLocation = {
        lat: verification.currentLocation.lat,
        lng: verification.currentLocation.lng,
        accuracy: verification.accuracy
      }

      let imageUrl = null
      if (photo) {
        imageUrl = await uploadImage(photo)
      }

      // Check for existing safety pin nearby
      const { data: existingPins } = await supabase
        .from('safety_pins')
        .select('*')
        .limit(100)

      let nearbyPin = null
      if (existingPins) {
        nearbyPin = existingPins.find(pin => {
          const distance = getDistance(verifiedLocation.lat, verifiedLocation.lng, pin.gps_lat, pin.gps_lng)
          return distance < 0.001 // ~100 meters
        })
      }

      if (nearbyPin) {
        // Update existing pin
        const newCount = nearbyPin.report_count + 1
        let dangerLevel = 'low'
        if (newCount >= 5) dangerLevel = 'critical'
        else if (newCount >= 3) dangerLevel = 'high'
        else if (newCount >= 2) dangerLevel = 'medium'

        await supabase
          .from('safety_pins')
          .update({
            report_count: newCount,
            danger_level: dangerLevel,
            last_reported_at: new Date().toISOString()
          })
          .eq('pin_id', nearbyPin.pin_id)
      } else {
        // Create new pin
        await supabase
          .from('safety_pins')
          .insert({
            gps_lat: verifiedLocation.lat,
            gps_lng: verifiedLocation.lng,
            report_count: 1,
            danger_level: 'low'
          })
      }

      // Create report with real-time GPS verification
      await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          type: reportType === 'net' ? 'net' : 'danger',
          status: 'pending',
          beach_id: selectedBeach.beach_id,
          gps_lat: verifiedLocation.lat,
          gps_lng: verifiedLocation.lng,
          image_before_url: imageUrl,
          description: `${description} - Real-time GPS verified at ${selectedBeach.name} (Accuracy: ${Math.round(verifiedLocation.accuracy)}m, Distance: ${Math.round(verification.distance)}m)`
        })

      // Send Telegram alert
      await sendTelegramAlert(reportType, {
        lat: verifiedLocation.lat,
        lng: verifiedLocation.lng,
        imageUrl: imageUrl,
        description: description,
        beachName: selectedBeach.name
      })

      setMessage('✅ Safety report submitted! Authorities have been notified.')
      setReportType('')
      setDescription('')
      setPhoto(null)

    } catch (err) {
      setError(err.message || 'Failed to submit report')
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

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

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
      <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>⚠️ Report Safety Issue</h2>

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
          Report Type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        >
          <option value="">Select type...</option>
          <option value="net">🕸️ Ghost Net</option>
          <option value="danger">⚠️ Dangerous Area</option>
          <option value="drowning">🚨 Drowning Risk</option>
          <option value="other">📢 Other</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the safety issue..."
          rows="3"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Photo (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files[0])}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px'
          }}
        />
        {photo && (
          <img
            src={URL.createObjectURL(photo)}
            alt="Preview"
            style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', objectFit: 'cover' }}
          />
        )}
      </div>

      {location && (
        <div style={{
          background: '#f3f4f6',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          📍 Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)} (±{Math.round(location.accuracy)}m)
          {selectedBeach && (
            <div style={{ marginTop: '0.25rem', color: '#059669' }}>
              🏖️ Beach: {selectedBeach.name}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !reportType || !location || !selectedBeach}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: loading || !reportType || !location || !selectedBeach ? '#9ca3af' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading || !reportType || !location || !selectedBeach ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Verifying Location...' : 'Submit Safety Report'}
      </button>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        ⚠️ <strong>Note:</strong> Your exact GPS location will be verified when submitting the report for accuracy.
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        <strong>🚨 Emergency:</strong> For immediate danger, call 100 (Police) or 108 (Ambulance)
      </div>
    </div>
  )
}

