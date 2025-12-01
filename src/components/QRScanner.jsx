import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, scannerId = "qr-reader" }) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null)

  const startScanning = async () => {
    try {
      setError('')
      setLoading(true)
      setScanning(true)

      // Wait a bit for the DOM to update
      await new Promise(resolve => setTimeout(resolve, 200))

      // Check if element exists
      const element = document.getElementById(scannerId)
      if (!element) {
        throw new Error('Scanner container not found')
      }

      // Create scanner instance (Simple config)
      const html5QrCode = new Html5Qrcode(scannerId)
      html5QrCodeRef.current = html5QrCode

      // Start scanning with default config
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // QR code detected
            handleScanSuccess(decodedText)
          },
          (errorMessage) => {
            // Ignore scanning errors
          }
        )
      } catch (startError) {
        // If camera fails, try with default camera
        console.log('Back camera failed, trying default camera...')
        await html5QrCode.start(
          undefined, // Use default camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            handleScanSuccess(decodedText)
          },
          () => { }
        )
      }
      setLoading(false)
    } catch (err) {
      console.error('Error starting scanner:', err)
      let errorMsg = 'Failed to start camera. '
      if (err.message?.includes('Permission') || err.name === 'NotAllowedError') {
        errorMsg += 'Please allow camera permissions in your browser settings.'
      } else if (err.message?.includes('not found')) {
        errorMsg += 'Scanner element not found.'
      } else if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
        errorMsg += 'No camera found. Please use manual input.'
      } else {
        errorMsg += `Error: ${err.message || 'Unknown error'}. Please use manual input.`
      }
      setError(errorMsg)
      setScanning(false)
      setLoading(false)
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
        } catch (e) { }
        html5QrCodeRef.current = null
      }
    }
  }

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
      setScanning(false)
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
  }

  const handleScanSuccess = (decodedText) => {
    stopScanning()
    onScan(decodedText)
  }

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim())
      setManualCode('')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')

      // Ensure scanner instance exists
      if (!html5QrCodeRef.current) {
        const html5QrCode = new Html5Qrcode(scannerId)
        html5QrCodeRef.current = html5QrCode
      }

      const result = await html5QrCodeRef.current.scanFile(file, false)
      handleScanSuccess(result)
    } catch (err) {
      setError('Failed to read QR code from image. Please make sure the QR code is clear and try again.')
      console.error(err)
      setLoading(false)
      // Clean up if we created a temporary instance
      if (html5QrCodeRef.current && !scanning) {
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => { })
      }
    }
  }, [])

  return (
    <div>
      {/* Scanner Container - Always present but hidden when not scanning/processing */}
      <div id={scannerId} style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        minHeight: scanning ? '300px' : '0',
        display: scanning ? 'block' : 'none'
      }}></div>

      {!scanning ? (
        <>
          <div style={{
            background: '#f3f4f6',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Scan QR code using camera or upload an image
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  startScanning()
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                📷 Start Camera Scanner
              </button>

              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    color: '#1e40af',
                    border: '1px solid #1e40af',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  🖼️ Upload QR Image
                </button>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              Or enter QR code manually:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Enter QR code data"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
              <button
                onClick={handleManualSubmit}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #1e40af',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <p style={{ color: '#6b7280' }}>Starting camera...</p>
            </div>
          )}

          {!loading && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  stopScanning()
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Stop Scanning
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '0.75rem',
          borderRadius: '8px',
          marginTop: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

