import React from 'react'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-red-950 to-black">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-red-900/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
          🌊KARAVLI CONNECT
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white animate-pulse-slow">Karavali Connect</h2>
      <p className="text-red-400 mt-2">Loading experience...</p>
    </div>
  )
}
