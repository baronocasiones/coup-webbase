import { useEffect, useState } from 'react'
import styles from '../styles/Toast.module.css'

/**
 * Toast Component
 * Simple notification component with auto-dismiss and smooth closing animation
 * 
 * Features:
 * - Built-in state management (no onClose callback needed)
 * - Smooth slide-in animation on mount
 * - Smooth slide-out animation on close
 * - Auto-dismiss with configurable duration
 * - 4 toast types: success, error, warning, info
 * - Full dark mode support
 * - Accessibility features (role="alert", keyboard support)
 * 
 * Props:
 * - id: unique identifier
 * - message: text to display
 * - type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
 * - duration: auto-dismiss time in ms (0 = manual only, default: 3000)
 * - icon: custom icon (optional)
 */
function Toast({ id, message, type = 'info', duration = 3000, icon = null }) {
    const [isClosing, setIsClosing] = useState(false)
    const [isVisible, setIsVisible] = useState(true)

    const handleClose = () => {
        setIsClosing(true)
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            setIsVisible(false)
        }, 300) // matches slideOutRight animation duration
    }

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [duration])

    if (!isVisible) {
        return null
    }

    const getIcon = () => {
        if (icon) return icon
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✕'
            case 'warning':
                return '⚠'
            case 'info':
                return 'ℹ'
            default:
                return '●'
        }
    }

    return (
        <div 
            className={`${styles.toast} ${styles[type]} ${isClosing ? styles.closing : ''}`} 
            role="alert" 
            aria-live="polite"
        >
            <span className={styles.icon}>{getIcon()}</span>
            <span className={styles.message}>{message}</span>
            <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close notification"
                type="button"
            >
                ✕
            </button>
        </div>
    )
}

export default Toast
