import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadImage } from '../services/cloudinary'
import { detectTrash, verifyCleanup } from '../services/ai'
import { config } from '../lib/config'
import CameraCapture from './CameraCapture'
import { activityVerificationService } from '../services/activityVerificationService'

export default function BeachCleanup({ user, selectedBeach, onUpdate }) {
  const [step, setStep] = useState('start') // 'start', 'before', 'cleaning', 'after', 'done'
  const [beforeImage, setBeforeImage] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [beforeImageUrl, setBeforeImageUrl] = useState(null)
  const [afterImageUrl, setAfterImageUrl] = useState(null)
  const timerRef = useRef(null)
  const beforeUrlRef = useRef(null)
  const afterUrlRef = useRef(null)
  const [startTime, setStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState(null) // 'before' or 'after'

  const startCleanup = () => {
    setStep('before')
    setCameraMode('before')
    setShowCamera(true)
    setMessage('Take a photo of the area with trash')
    setError('') // Clear any previous errors
  }

  const handleManualOverride = () => {
    setError('')
    setMessage('✅ Manual override accepted. Timer started - clean for at least 5 minutes.')
    setStep('cleaning')
    const now = Date.now()
    setStartTime(now)
  }

  const handleBeforeCapture = async (file) => {
    setLoading(true)
    setError('')
    setShowCamera(false)

    try {
      // Clean up previous URL if exists
      if (beforeUrlRef.current) {
        URL.revokeObjectURL(beforeUrlRef.current)
      }

      const imageUrl = URL.createObjectURL(file)
      beforeUrlRef.current = imageUrl
      setBeforeImageUrl(imageUrl)
      setBeforeImage(file)

      // Create image element for AI
      const img = new Image()
      img.src = imageUrl

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // AI Detection
      const result = await detectTrash(img)
      setAiResult(result)

      if (!result.trashDetected) {
        setError('No trash detected in the image. Please take a photo of an area with visible trash.')
        setLoading(false)
        // Do NOT clear image state here, so user can override
        return
      }

      setMessage(`✅ Trash detected! ${result.predictions.length} items found. Timer started - clean for at least 5 minutes.`)
      setStep('cleaning')
      const now = Date.now()
      setStartTime(now)

    } catch (err) {
      setError(err.message || 'Failed to process image')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'cleaning' && startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        setElapsedTime(elapsed)
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [step, startTime])

  const finishCleanup = async () => {
    if (elapsedTime < config.cleanupMinTime) {
      const remaining = Math.ceil((config.cleanupMinTime - elapsedTime) / 1000 / 60)
      setError(`Please clean for at least 5 minutes. ${remaining} minute(s) remaining.`)
      return
    }

    setStep('after')
    setCameraMode('after')
    setShowCamera(true)
    setMessage('Take a photo of the cleaned area')
  }

  const handleAfterCapture = async (file) => {
    setLoading(true)
    setError('')
    setShowCamera(false)

    try {
      // Clean up previous URL if exists
      if (afterUrlRef.current) {
        URL.revokeObjectURL(afterUrlRef.current)
      }

      const imageUrl = URL.createObjectURL(file)
      afterUrlRef.current = imageUrl
      setAfterImageUrl(imageUrl)
      setAfterImage(file)

      const img = new Image()
      img.src = imageUrl

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // AI Verification
      const result = await verifyCleanup(img)

      if (!result.isClean) {
        setError(`Cleanup incomplete. Still detected ${result.trashCount} trash items. Please clean more thoroughly.`)
        setLoading(false)
        return
      }

      await completeCleanup(file)

    } catch (err) {
      setError(err.message || 'Failed to verify cleanup')
    } finally {
      setLoading(false)
    }
  }

  const completeCleanup = async (currentAfterImage = null) => {
    setLoading(true)
    setError('')

    try {
      const imageToUpload = currentAfterImage || afterImage

      // Verify real-time GPS location for activity
      const verification = await activityVerificationService.verifyActivityLocation(
        user.id,
        selectedBeach.beach_id,
        'cleanup'
      )

      const verificationResult = activityVerificationService.formatVerificationResult(verification)

      if (!verificationResult.success) {
        throw new Error(verificationResult.message)
      }

      // Check GPS accuracy
      if (!activityVerificationService.isAccuracySufficient(verification.accuracy, 'cleanup')) {
        throw new Error(`GPS accuracy too low (${Math.round(verification.accuracy)}m). Please wait for better signal or move to open area.`)
      }

      const userLat = verification.currentLocation.lat
      const userLng = verification.currentLocation.lng

      // Upload images
      const beforeUrl = await uploadImage(beforeImage)
      const afterUrl = await uploadImage(imageToUpload)

      // Create report with live location tracking
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          type: 'cleanup',
          status: 'verified',
          beach_id: selectedBeach.beach_id,
          gps_lat: userLat,
          gps_lng: userLng,
          image_before_url: beforeUrl,
          image_after_url: afterUrl,
          coins_awarded: 50,
          description: `Beach cleanup at ${selectedBeach.name} - Real-time GPS verified (Accuracy: ${Math.round(verification.accuracy)}m, Distance: ${Math.round(verification.distance)}m)`
        })

      if (reportError) throw reportError

      // Award coins immediately
      await supabase.rpc('increment_coins', {
        user_id_param: user.id,
        coins_param: 50
      })

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'earned',
          coins_amount: 50,
          description: 'Beach cleanup verified'
        })

      setMessage('🎉 Cleanup verified! You earned 50 coins!')
      setStep('done')
      onUpdate()

    } catch (err) {
      setError(err.message || 'Failed to complete cleanup')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationOverride = () => {
    completeCleanup()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beforeUrlRef.current) {
        URL.revokeObjectURL(beforeUrlRef.current)
      }
      if (afterUrlRef.current) {
        URL.revokeObjectURL(afterUrlRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const reset = () => {
    // Clean up URLs
    if (beforeUrlRef.current) {
      URL.revokeObjectURL(beforeUrlRef.current)
      beforeUrlRef.current = null
    }
    if (afterUrlRef.current) {
      URL.revokeObjectURL(afterUrlRef.current)
      afterUrlRef.current = null
    }

    // Clean up timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setStep('start')
    setBeforeImage(null)
    setAfterImage(null)
    setBeforeImageUrl(null)
    setAfterImageUrl(null)
    setStartTime(null)
    setElapsedTime(0)
    setMessage('')
    setError('')
    setAiResult(null)
  }

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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
      <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>🧹 Beach Cleanup</h2>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <p style={{ marginBottom: error.includes('No trash detected') ? '0.5rem' : 0 }}>{error}</p>
          {error.includes('No trash detected') && (
            <button
              onClick={handleManualOverride}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              I confirm this is trash
            </button>
          )}
          {error.includes('Cleanup incomplete') && (
            <button
              onClick={handleVerificationOverride}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              I confirm area is clean
            </button>
          )}
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

      {step === 'start' && (
        <div>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Clean a beach area and earn 50 coins! AI will verify your work.
          </p>
          <button
            onClick={startCleanup}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Cleanup
          </button>
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={cameraMode === 'before' ? handleBeforeCapture : handleAfterCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {step === 'cleaning' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>
            ⏱️
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: '#1e40af',
            marginBottom: '1rem'
          }}>
            {formatTime(elapsedTime)}
          </div>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Keep cleaning! Minimum 5 minutes required.
          </p>
          <button
            onClick={finishCleanup}
            disabled={elapsedTime < config.cleanupMinTime}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: elapsedTime >= config.cleanupMinTime ? '#10b981' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: elapsedTime >= config.cleanupMinTime ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
          >
            {elapsedTime >= config.cleanupMinTime
              ? 'Finished Cleaning'
              : `Wait ${Math.ceil((config.cleanupMinTime - elapsedTime) / 1000)}s to Finish`}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ marginBottom: '1rem' }}>Cleanup Complete!</h3>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            You earned 50 coins!
          </p>
          <button
            onClick={reset}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Another Cleanup
          </button>
        </div>
      )}

      {beforeImageUrl && (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Before:</strong></p>
          <img src={beforeImageUrl} alt="Before" style={{ width: '100%', borderRadius: '8px' }} />
        </div>
      )}

      {afterImageUrl && (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>After:</strong></p>
          <img src={afterImageUrl} alt="After" style={{ width: '100%', borderRadius: '8px' }} />
        </div>
      )}
    </div>
  )
}

