import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NetRescueManager({ user }) {
  const [reports, setReports] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
    
    // Real-time subscription
    const reportsSubscription = supabase
      .channel('net-rescue-reports')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reports',
          filter: `type=eq.net`
        },
        () => {
          loadReports()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reportsSubscription)
    }
  }, [])

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        users!reports_user_id_fkey(phone_number, name)
      `)
      .eq('type', 'net')
      .order('created_at', { ascending: false })

    if (data) {
      setReports(data)
    }
  }

  const handleStatusUpdate = async (reportId, newStatus) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('report_id', reportId)

      if (updateError) throw updateError

      setMessage(`✅ Report status updated to ${newStatus}`)
      loadReports()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      verified: '#10b981',
      cleared: '#1e40af',
      rejected: '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  const filteredReports = filterType === 'all' 
    ? reports 
    : reports.filter(r => r.status === filterType)

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

      {/* Filter */}
      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: '500', marginRight: '0.5rem' }}>Filter:</span>
        {['all', 'pending', 'verified', 'cleared'].map(status => (
          <button
            key={status}
            onClick={() => setFilterType(status)}
            style={{
              padding: '0.5rem 1rem',
              background: filterType === status ? '#059669' : 'white',
              color: filterType === status ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textTransform: 'capitalize'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2>🕸️ Ghost Net & Rescue Reports ({filteredReports.length})</h2>
        </div>

        {filteredReports.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No net/rescue reports found
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredReports.map(report => (
              <div
                key={report.report_id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      Reported by: {report.users?.name || report.users?.phone_number || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Location: {report.gps_lat}, {report.gps_lng}
                    </div>
                    {report.description && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        {report.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {new Date(report.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: getStatusColor(report.status),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {report.status}
                  </span>
                </div>

                {report.image_before_url && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <img 
                      src={report.image_before_url} 
                      alt="Report" 
                      style={{
                        maxWidth: '200px',
                        maxHeight: '150px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <select
                    value={report.status}
                    onChange={(e) => handleStatusUpdate(report.report_id, e.target.value)}
                    disabled={loading}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="cleared">Cleared</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {report.gps_lat && report.gps_lng && (
                    <a
                      href={`https://www.google.com/maps?q=${report.gps_lat},${report.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1e40af',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}
                    >
                      📍 View on Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


