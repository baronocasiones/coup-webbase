import styles from './../styles/Chatbox.module.css'
import PrimaryButton from './PrimaryButton'

function ChatBox({ header, withSubmission=true }) {
    return (
        <div className={styles.chatBoxContainer}>
            <h2>{header}</h2>
            <div className={styles.chats}>
                <div className={styles.messageContainer}>
                    <div className={styles.senderName}>Alexandra</div>
                    <div className={styles.message}>Welcome everyone! Ready for some intense gameplay?</div>
                </div>
                <div className={styles.messageContainer}>
                    <div className={styles.senderName}>Marcus</div>
                    <div className={styles.message}>Let's do this! I'm ready to bluff my way through victory</div>
                </div>
                <div className={styles.messageContainer}>
                    <div className={styles.senderName}>Sophia</div>
                    <div className={styles.message}>First time playing, be gentle</div>
                </div>
                <div className={styles.messageContainer}>
                    <div className={styles.senderName}>James</div>
                    <div className={styles.message}>No mercy! All set here</div>
                </div>
            </div>
            {withSubmission && (
                <form className={styles.chatInputContainer}>
                    <input className={styles.chatInput} type="text" placeholder="Type a message..." />
                    <PrimaryButton text='Send' />
                </form>
            )}
        </div>
    )
}

export default ChatBox;
