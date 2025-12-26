import { useEffect, useState } from 'react';

export default function NotificationToast({ notification, onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const getIcon = (type) => {
        switch (type) {
            case 'safety_report':
                return '🚨';
            case 'payment_request':
                return '💰';
            case 'bin_overflow':
                return '🗑️';
            case 'rescue_request':
                return '🆘';
            default:
                return '🔔';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'safety_report':
                return 'bg-red-500';
            case 'payment_request':
                return 'bg-green-500';
            case 'bin_overflow':
                return 'bg-orange-500';
            case 'rescue_request':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div
            className={`fixed top-20 right-4 z-50 transform transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-4 max-w-sm">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 ${getColor(notification.data?.type)} rounded-full flex items-center justify-center text-xl`}>
                        {getIcon(notification.data?.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-sm">
                            {notification.notification?.title || notification.title}
                        </h4>
                        <p className="text-gray-300 text-sm mt-1">
                            {notification.notification?.body || notification.body}
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Action button if URL provided */}
                {notification.data?.url && (
                    <div className="mt-3">
                        <button
                            onClick={() => {
                                window.location.href = notification.data.url;
                                handleClose();
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                        >
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
