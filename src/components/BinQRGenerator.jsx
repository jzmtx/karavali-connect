import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'

export default function BinQRGenerator() {
  const [bins, setBins] = useState([])
  const [newBin, setNewBin] = useState({
    bin_id: '',
    gps_lat: '',
    gps_lng: '',
    qr_code: ''
  })
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedBin, setSelectedBin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadBins()
  }, [])

  const loadBins = async () => {
    const { data } = await supabase
      .from('bins')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setBins(data)
    }
  }

  const generateQRCode = async (binId, qrCodeData) => {
    try {
      const qrUrl = await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      return qrUrl
    } catch (err) {
      console.error('QR generation error:', err)
      return null
    }
  }

  const handleCreateBin = async () => {
    if (!newBin.bin_id || !newBin.gps_lat || !newBin.gps_lng) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Generate QR code string
      const qrCodeString = `BIN-${newBin.bin_id}-${Date.now()}`
      
      // Create bin
      const { error: createError } = await supabase
        .from('bins')
        .insert({
          bin_id: newBin.bin_id,
          qr_code: qrCodeString,
          gps_lat: parseFloat(newBin.gps_lat),
          gps_lng: parseFloat(newBin.gps_lng),
          status: 'empty'
        })

      if (createError) throw createError

      // Generate QR code image
      const qrUrl = await generateQRCode(newBin.bin_id, qrCodeString)
      if (qrUrl) {
        setQrCodeUrl(qrUrl)
        setSelectedBin({ ...newBin, qr_code: qrCodeString })
      }

      setMessage('✅ Bin created successfully! QR code generated.')
      setNewBin({ bin_id: '', gps_lat: '', gps_lng: '', qr_code: '' })
      loadBins()
    } catch (err) {
      setError(err.message || 'Failed to create bin')
    } finally {
      setLoading(false)
    }
  }

  const handleViewQR = async (bin) => {
    const qrUrl = await generateQRCode(bin.bin_id, bin.qr_code)
    if (qrUrl) {
      setQrCodeUrl(qrUrl)
      setSelectedBin(bin)
    }
  }

  return (
    <div>
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>🗑️ Create New Bin & Generate QR</h2>

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Bin ID
            </label>
            <input
              type="text"
              value={newBin.bin_id}
              onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value })}
              placeholder="BIN-001"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={newBin.gps_lat}
              onChange={(e) => setNewBin({ ...newBin, gps_lat: e.target.value })}
              placeholder="13.350000"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={newBin.gps_lng}
            onChange={(e) => setNewBin({ ...newBin, gps_lng: e.target.value })}
            placeholder="74.700000"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
        </div>

        <button
          onClick={handleCreateBin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: loading ? '#9ca3af' : '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Bin & Generate QR Code'}
        </button>
      </div>

      {qrCodeUrl && selectedBin && (
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>QR Code for {selectedBin.bin_id}</h3>
          <div style={{
            background: '#f3f4f6',
            padding: '1rem',
            borderRadius: '8px',
            display: 'inline-block',
            marginBottom: '1rem'
          }}>
            <img src={qrCodeUrl} alt="QR Code" style={{ width: '300px', height: '300px' }} />
          </div>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
            <strong>QR Code Data:</strong> {selectedBin.qr_code}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Print this QR code and attach it to the bin
          </p>
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = qrCodeUrl
              link.download = `${selectedBin.bin_id}-qr.png`
              link.click()
            }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            📥 Download QR Code
          </button>
        </div>
      )}

      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>All Bins</h3>
        {bins.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            No bins created yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {bins.map(bin => (
              <div
                key={bin.bin_id}
                style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{bin.bin_id}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {bin.gps_lat}, {bin.gps_lng} • Status: {bin.status}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    QR: {bin.qr_code}
                  </div>
                </div>
                <button
                  onClick={() => handleViewQR(bin)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1e40af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  View QR
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

