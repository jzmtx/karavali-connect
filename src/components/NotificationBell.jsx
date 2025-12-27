import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

export default function NotificationBell({ userId }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;

        loadNotifications();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000);

        return () => clearInterval(interval);
    }, [userId]);

    const loadNotifications = async () => {
        if (!userId) return;

        try {
            const count = await notificationService.getUnreadCount(userId);
            setUnreadCount(count);

            if (showDropdown) {
                const notifs = await notificationService.getNotifications(userId, 10);
                setNotifications(notifs);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            // Silently fail - bell will still be visible
        }
    };

    const handleBellClick = async () => {
        setShowDropdown(!showDropdown);

        if (!showDropdown) {
            setLoading(true);
            try {
                const notifs = await notificationService.getNotifications(userId, 10);
                setNotifications(notifs);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as read
            await notificationService.markAsRead(notification.id);

            // Update UI
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Navigate based on notification type
            if (notification.data?.url) {
                window.location.href = notification.data.url;
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Notifications"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-700">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Notifications</h3>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-400">{unreadCount} unread</p>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="px-4 py-8 text-center text-gray-400">
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-400">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${!notification.read ? 'bg-gray-750' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon based on type */}
                                            <div className="flex-shrink-0 mt-1">
                                                {notification.type === 'safety_report' && (
                                                    <span className="text-red-500">🚨</span>
                                                )}
                                                {notification.type === 'payment_request' && (
                                                    <span className="text-green-500">💰</span>
                                                )}
                                                {notification.type === 'bin_overflow' && (
                                                    <span className="text-orange-500">🗑️</span>
                                                )}
                                                {notification.type === 'rescue_request' && (
                                                    <span className="text-blue-500">🆘</span>
                                                )}
                                                {!['safety_report', 'payment_request', 'bin_overflow', 'rescue_request'].includes(notification.type) && (
                                                    <span className="text-gray-500">🔔</span>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {notification.body}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notification.read && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 border-t border-gray-700 text-center">
                                <button className="text-sm text-blue-400 hover:text-blue-300">
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
