import React from 'react'

/**
 * Reusable Card Component
 * @param {object} props
 * @param {boolean} [props.hover=false] - Enable hover effects
 * @param {'glass' | 'solid' | 'outline'} [props.variant='glass'] - Card style variant
 * @param {'none' | 'sm' | 'md' | 'lg'} [props.padding='lg'] - Padding size
 * @param {string} [props.className] - Additional classes
 */
export default function Card({
    children,
    className = '',
    hover = false,
    variant = 'glass',
    padding = 'lg',
    ...props
}) {
    const baseClass = variant === 'glass' ? 'glass-card' :
        variant === 'solid' ? 'bg-black/80 border border-white/10 rounded-xl' :
            'border border-white/20 rounded-xl bg-transparent'

    const hoverClass = hover ? 'hover:scale-[1.02] hover:shadow-glow transition-all duration-300 cursor-pointer' : ''

    const paddingClasses = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6'
    }

    return (
        <div className={`${baseClass} ${paddingClasses[padding]} ${hoverClass} ${className}`} {...props}>
            {children}
        </div>
    )
}
