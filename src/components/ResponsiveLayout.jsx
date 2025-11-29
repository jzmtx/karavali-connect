import { useState, useEffect } from 'react'

export default function ResponsiveLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false)
  const [screenSize, setScreenSize] = useState('desktop')

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width < 480) {
        setScreenSize('mobile')
        setIsMobile(true)
      } else if (width < 768) {
        setScreenSize('tablet-small')
        setIsMobile(true)
      } else if (width < 1024) {
        setScreenSize('tablet')
        setIsMobile(false)
      } else {
        setScreenSize('desktop')
        setIsMobile(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    window.addEventListener('orientationchange', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
      window.removeEventListener('orientationchange', checkScreenSize)
    }
  }, [])

  return (
    <div 
      className={`responsive-layout ${screenSize} ${isMobile ? 'mobile' : 'desktop'}`}
      data-screen-size={screenSize}
    >
      {children}
    </div>
  )
}