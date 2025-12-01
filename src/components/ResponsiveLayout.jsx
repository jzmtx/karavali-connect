import React from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Responsive Layout Wrapper
 * Handles consistent spacing, max-width, and page transitions
 */
export default function ResponsiveLayout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-red-950 to-black text-white overflow-x-hidden">
      {/* 
        We use a key based on location.pathname to trigger the animation 
        whenever the route changes.
      */}
      <div
        key={location.pathname}
        className="animate-fade-in w-full min-h-screen flex flex-col"
      >
        {children}
      </div>
    </div>
  )
}