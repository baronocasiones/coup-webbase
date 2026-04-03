import styles from './../styles/PlayRoom.module.css'

function Modal({ children, status, style }) {
    return (
        <div className={styles.movePreview} style={style}>
            <div className={styles.movePreviewBadge}>{status}</div>
            {children}
        </div>
    )
}

export default Modal;
