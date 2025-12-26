import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BinStatusManager({ bins, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleStatusUpdate = async (binId, newStatus) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: updateError } = await supabase
        .from('bins')
        .update({
          status: newStatus,
          last_reported_time: new Date().toISOString()
        })
        .eq('bin_id', binId)

      if (updateError) throw updateError

      setMessage(`✅ Bin ${binId} status updated to ${newStatus}`)
      onUpdate()
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update bin status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      empty: '#10b981',
      full: '#f59e0b',
      cleared: '#1e40af'
    }
    return colors[status] || '#6b7280'
  }

  return (
    <div>
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

      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2>🗑️ Bin Status Management ({bins.length} bins)</h2>
        </div>

        {bins.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No bins found. Create bins first.
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {bins.map(bin => (
              <div
                key={bin.bin_id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {bin.bin_id}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Location: {bin.gps_lat}, {bin.gps_lng}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Last reported: {bin.last_reported_time ? new Date(bin.last_reported_time).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: getStatusColor(bin.status),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {bin.status}
                  </span>

                  <select
                    value={bin.status}
                    onChange={(e) => handleStatusUpdate(bin.bin_id, e.target.value)}
                    disabled={loading}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="empty">Empty</option>
                    <option value="full">Full</option>
                    <option value="cleared">Cleared</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


