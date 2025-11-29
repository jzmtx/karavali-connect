export default function ReportList({ reports, onStatusChange }) {
  const getTypeIcon = (type) => {
    const icons = {
      bin: '🗑️',
      cleanup: '🧹',
      dispose: '♻️',
      net: '🕸️',
      danger: '⚠️'
    }
    return icons[type] || '📢'
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

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <h2>Reports</h2>
      </div>

      {reports.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No reports yet
        </div>
      ) : (
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {reports.map(report => (
            <div
              key={report.report_id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ fontSize: '2rem' }}>
                {getTypeIcon(report.type)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{report.type}</strong>
                    <span style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      background: getStatusColor(report.status),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {report.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                </div>

                {report.description && (
                  <p style={{ marginBottom: '0.5rem', color: '#6b7280' }}>
                    {report.description}
                  </p>
                )}

                {report.gps_lat && report.gps_lng && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    📍 {report.gps_lat.toFixed(6)}, {report.gps_lng.toFixed(6)}
                    <a
                      href={`https://www.google.com/maps?q=${report.gps_lat},${report.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: '0.5rem', color: '#1e40af' }}
                    >
                      View on Maps
                    </a>
                  </div>
                )}

                {report.users && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Reported by: {report.users.phone_number}
                  </div>
                )}

                {report.coins_awarded > 0 && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#10b981',
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                  }}>
                    💰 Coins Awarded: {report.coins_awarded}
                    {report.status === 'pending' && report.type === 'bin' && (
                      <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
                        (Pending - will be added when verified)
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {report.image_before_url && (
                    <img
                      src={report.image_before_url}
                      alt="Before"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(report.image_before_url, '_blank')}
                    />
                  )}
                  {report.image_after_url && (
                    <img
                      src={report.image_after_url}
                      alt="After"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(report.image_after_url, '_blank')}
                    />
                  )}
                </div>

                {/* Status Change Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginTop: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  {report.status === 'pending' && (
                    <button
                      onClick={() => onStatusChange(report.report_id, 'verified', report)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      ✓ Verify
                    </button>
                  )}
                  
                  {report.status === 'verified' && (
                    <button
                      onClick={() => onStatusChange(report.report_id, 'cleared', report)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1e40af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      ✅ Mark as Cleared
                    </button>
                  )}
                  
                  {report.status === 'pending' && (
                    <button
                      onClick={() => onStatusChange(report.report_id, 'cleared', report)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1e40af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      ✅ Mark as Cleared
                    </button>
                  )}
                  
                  {(report.status === 'verified' || report.status === 'cleared') && (
                    <button
                      onClick={() => onStatusChange(report.report_id, 'pending', report)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      ↺ Revert to Pending
                    </button>
                  )}
                  
                  {report.status !== 'rejected' && (
                    <button
                      onClick={() => onStatusChange(report.report_id, 'rejected', report)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      ✗ Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

