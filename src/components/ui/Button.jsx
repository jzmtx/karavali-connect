import React from 'react'

/**
 * Reusable Button Component
 * @param {object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link'} [props.variant='primary'] - Button style variant
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} [props.size='md'] - Button size
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {boolean} [props.fullWidth=false] - Whether button takes full width
 * @param {React.ReactNode} [props.icon] - Optional icon component
 * @param {string} [props.className] - Additional classes
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    icon,
    className = '',
    disabled,
    ...props
}) {
    const baseClass = 'btn'
    const variantClass = `btn-${variant}`
    const widthClass = fullWidth ? 'w-full' : ''

    const sizeClasses = {
        xs: 'text-xs px-2.5 py-1.5',
        sm: 'text-sm px-3 py-2',
        md: 'text-base px-6 py-3',
        lg: 'text-lg px-8 py-4',
        xl: 'text-xl px-10 py-5'
    }

    return (
        <button
            className={`${baseClass} ${variantClass} ${sizeClasses[size]} ${widthClass} ${className} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && icon && (
                <span className="mr-2 inline-flex items-center">{icon}</span>
            )}
            {children}
        </button>
    )
}
