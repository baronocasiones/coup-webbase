import styles from './../styles/PlayRoom.module.css'

function Modal({ children, status, style }) {
    const isVisible = style?.visibility === 'visible'

    return (
        <div
            className={styles.modalBackdrop}
            style={{
                visibility: isVisible ? 'visible' : 'hidden',
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
            <div className={styles.movePreview}>
                <div className={styles.movePreviewBadge}>{status}</div>
                {children}
            </div>
        </div>
    )
}

export default Modal
