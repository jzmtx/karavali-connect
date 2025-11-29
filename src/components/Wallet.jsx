import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'
import { config } from '../lib/config'

export default function Wallet({ user, coinBalance }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [qrSecret, setQrSecret] = useState('')
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    generateQRCode()
    loadTransactions()
    
    // Refresh QR code every 30 seconds
    const interval = setInterval(() => {
      generateQRCode()
    }, config.qrCodeRefreshInterval)

    return () => clearInterval(interval)
  }, [user])

  const generateQRCode = async () => {
    try {
      // Generate new secret
      const secret = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setQrSecret(secret)

      // Store in database
      await supabase
        .from('user_qr_codes')
        .upsert({
          user_id: user.id,
          qr_secret: secret,
          expires_at: new Date(Date.now() + config.qrCodeRefreshInterval * 2).toISOString()
        })

      // Generate QR code
      const qrData = JSON.stringify({
        userId: user.id,
        secret: secret,
        timestamp: Date.now()
      })

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      })

      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setTransactions(data)
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
      <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>💰 My Wallet</h2>

      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
          Karavali Coins
        </div>
        <div style={{ fontSize: '3rem', fontWeight: '700' }}>
          {coinBalance}
        </div>
      </div>

      <div style={{
        background: '#f3f4f6',
        padding: '1.5rem',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <p style={{ marginBottom: '1rem', fontWeight: '500' }}>
          Show this QR code to merchants to redeem coins
        </p>
        {qrCodeUrl && (
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            <img src={qrCodeUrl} alt="QR Code" style={{ width: '250px', height: '250px' }} />
          </div>
        )}
        <p style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          QR code refreshes every 30 seconds for security
        </p>
      </div>

      <div>
        <h3 style={{ marginBottom: '1rem' }}>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            No transactions yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {transactions.map(tx => (
              <div
                key={tx.tx_id}
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
                  <div style={{ fontWeight: '500' }}>
                    {tx.type === 'earned' ? '✅ Earned' : tx.type === 'redeemed' ? '💳 Redeemed' : '⏳ Pending'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {tx.description || 'Transaction'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: tx.type === 'earned' ? '#10b981' : '#ef4444'
                }}>
                  {tx.type === 'earned' ? '+' : '-'}{tx.coins_amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

