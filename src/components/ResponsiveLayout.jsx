import { useState, useEffect } from 'react'

export default function ResponsiveLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false)
  const [screenSize, setScreenSize] = useState('desktop')
  const [orientation, setOrientation] = useState('portrait')

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Determine screen size
      if (width < 480) {
        setScreenSize('mobile-xs')
        setIsMobile(true)
      } else if (width < 768) {
        setScreenSize('mobile')
        setIsMobile(true)
      } else if (width < 1024) {
        setScreenSize('tablet')
        setIsMobile(true)
      } else if (width < 1440) {
        setScreenSize('desktop')
        setIsMobile(false)
      } else {
        setScreenSize('desktop-lg')
        setIsMobile(false)
      }
      
      // Determine orientation
      setOrientation(width > height ? 'landscape' : 'portrait')
    }

    checkScreenSize()
    
    const resizeHandler = () => {
      // Debounce resize events
      clearTimeout(window.resizeTimeout)
      window.resizeTimeout = setTimeout(checkScreenSize, 100)
    }
    
    window.addEventListener('resize', resizeHandler)
    window.addEventListener('orientationchange', () => {
      // Delay orientation change to allow for proper viewport adjustment
      setTimeout(checkScreenSize, 300)
    })

    return () => {
      window.removeEventListener('resize', resizeHandler)
      window.removeEventListener('orientationchange', checkScreenSize)
      clearTimeout(window.resizeTimeout)
    }
  }, [])

  return (
    <div 
      className={`responsive-layout ${screenSize} ${isMobile ? 'mobile' : 'desktop'} ${orientation}`}
      data-screen-size={screenSize}
      data-orientation={orientation}
      style={{
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden auto'
      }}
    >
      {children}
    </div>
  )
}