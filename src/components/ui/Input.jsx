import React from 'react'

/**
 * Reusable Input Component
 * @param {object} props
 * @param {string} [props.label] - Input label
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {React.ReactNode} [props.leftIcon] - Icon to display on the left
 * @param {React.ReactNode} [props.rightIcon] - Icon to display on the right
 * @param {string} [props.className] - Additional classes
 */
export default function Input({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className = '',
    id,
    ...props
}) {
    const inputId = id || props.name || Math.random().toString(36).substr(2, 9)

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-200 mb-1.5 ml-1"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={`form-input ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-400 ml-1 flex items-center gap-1">
                    <span>⚠️</span> {error}
                </p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-sm text-gray-500 ml-1">{helperText}</p>
            )}
        </div>
    )
}
