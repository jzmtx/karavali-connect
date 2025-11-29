import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PaymentRequests({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadRequests()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadRequests()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    const { data } = await supabase
      .from('payment_requests')
      .select(`
        *,
        merchants:merchant_id(phone_number, merchant_coins)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setRequests(data)
    }
  }

  const handleApprove = async (requestId, merchantId, coinsAmount, amountRequested) => {
    if (!confirm(`Approve payment of ₹${amountRequested.toFixed(2)} for ${coinsAmount} coins?`)) {
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)

      if (updateError) throw updateError

      // Deduct coins from merchant
      await supabase.rpc('decrement_merchant_coins', {
        merchant_id_param: merchantId,
        coins_param: coinsAmount
      })

      setMessage('✅ Payment request approved! Merchant coins deducted.')
      loadRequests()
    } catch (err) {
      setError(err.message || 'Failed to approve payment')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (requestId) => {
    const paymentProof = prompt('Enter payment proof URL or transaction ID:')
    if (!paymentProof) return

    setLoading(true)
    setError('')

    try {
      await supabase
        .from('payment_requests')
        .update({
          status: 'paid',
          payment_proof_url: paymentProof,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)

      setMessage('✅ Payment marked as paid!')
      loadRequests()
    } catch (err) {
      setError(err.message || 'Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (requestId) => {
    const notes = prompt('Enter rejection reason:')
    if (!notes) return

    setLoading(true)
    setError('')

    try {
      await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)

      setMessage('Request rejected.')
      loadRequests()
    } catch (err) {
      setError(err.message || 'Failed to reject request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#10b981',
      paid: '#1e40af',
      rejected: '#ef4444'
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
          <h2>💰 Payment Requests from Merchants</h2>
        </div>

        {requests.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No payment requests yet
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {requests.map(request => (
              <div
                key={request.request_id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      Merchant: {request.merchants?.phone_number || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Coins: {request.coins_amount} • Amount: ₹{request.amount_requested.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Rate: ₹{request.conversion_rate.toFixed(4)} per coin
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      Requested: {new Date(request.created_at).toLocaleString()}
                    </div>
                    {request.notes && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        Notes: {request.notes}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: getStatusColor(request.status),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {request.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(
                          request.request_id,
                          request.merchant_id,
                          request.coins_amount,
                          request.amount_requested
                        )}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.request_id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                  
                  {request.status === 'approved' && (
                    <button
                      onClick={() => handleMarkPaid(request.request_id)}
                      disabled={loading}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1e40af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      💳 Mark as Paid
                    </button>
                  )}

                  {request.payment_proof_url && (
                    <a
                      href={request.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f3f4f6',
                        color: '#1e40af',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem'
                      }}
                    >
                      View Proof
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
