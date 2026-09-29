import styles from './../styles/Chatbox.module.css'
import PrimaryButton from './PrimaryButton'
import { useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChatMessages, addChatMessage } from '../services/chat'
import ChatBoxSkeleton from './ChatBoxSkeleton'
import { buildWsUrl } from '../utils/ws'
import { animate, stagger } from 'animejs'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, selAll } from '../utils/motion'

/** System messages from game events (no userId or special sender) */
function isSystemMessage(msg) {
    return !msg.userId || msg.sender_username === 'System'
}

/** Most messages a single render is allowed to animate in. */
const MAX_ANIMATED_MESSAGES = 6

function ChatBox({ header, withSubmission = true }) {
    const queryClient = useQueryClient()
    const inputRef = useRef()
    const userId = sessionStorage.getItem('userId')
    const chatContainerRef = useRef()
    const chatWs = useRef(null)
    const previousCount = useRef(0)
    const { data: messageDatas, isLoading } = useQuery({
        queryKey: ['chatMessages'],
        queryFn: getChatMessages,
        refetchOnWindowFocus: false
    })
    const { mutate: sendChatMutation } = useMutation({
        mutationFn: addChatMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] })
        },
        onError: (error) => {
            console.error('Error sending message:', error)
        },
    })

    const [rootRef, , play] = useAnimeScope((root) => {
        animate(selAll(root, styles.chatBoxContainer), {
            opacity: { from: 0 },
            translateX: { from: 16 },
            duration: DURATION.slow,
            ease: EASE.entrance,
        })
    })

    useEffect(() => {
        if (!chatContainerRef.current) return
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }, [messageDatas])

    /**
     * Animate in only what just arrived.
     *
     * Re-animating the whole log on every update would make each new message
     * restart the entire history's entrance — a 200-message log would
     * re-cascade 200 times. Tracking the previous count lets us target just
     * the appended nodes, and capping the batch keeps an initial load of
     * several hundred messages from cascading for a minute.
     */
    useEffect(() => {
        const container = chatContainerRef.current
        if (!container || !Array.isArray(messageDatas)) return

        const count = messageDatas.length
        const added = count - previousCount.current
        previousCount.current = count
        if (added <= 0) return

        const incoming = Array.from(container.children)
            .slice(-Math.min(added, MAX_ANIMATED_MESSAGES))
            .filter((el) => el instanceof HTMLElement)

        if (incoming.length === 0) return

        play(() =>
            animate(incoming, {
                opacity: [{ from: 0 }, { to: 1 }],
                translateY: [{ from: 10 }, { to: 0 }],
                scale: [{ from: 0.98 }, { to: 1 }],
                duration: DURATION.normal,
                ease: EASE.entrance,
                delay: stagger(40),
            })
        )
    }, [messageDatas, play])

    useEffect(() => {
        if (userId && withSubmission) {
            chatWs.current = new WebSocket(buildWsUrl('/ws/chat', userId))

            chatWs.current.onmessage = (event) => {
                try {
                    const chats = JSON.parse(event.data)
                    queryClient.setQueryData(['chatMessages'], chats)
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error)
                }
            }

            chatWs.current.onopen = () => {
                console.log('Chat WebSocket connection established')
            }

            chatWs.current.onclose = () => {
                console.log('Chat WebSocket connection closed')
            }

            chatWs.current.onerror = (error) => {
                console.error('Chat WebSocket error:', error)
            }
        }

        return () => {
            if (chatWs.current && chatWs.current.readyState === WebSocket.OPEN) {
                chatWs.current.close()
            }
        }
    }, [userId, queryClient])

    return (
        <div className={styles.chatBoxContainer} ref={rootRef}>
            <h2>{header}</h2>
            <div
                className={styles.chats}
                ref={chatContainerRef}
                /*
                 * Messages arrive over a WebSocket with no page interaction, so
                 * the arrival animation is the only signal a sighted player
                 * gets that something was said. `role="log"` gives the screen
                 * reader equivalent; `aria-relevant="additions"` keeps it from
                 * re-announcing the entire history on each update.
                 */
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label={header}
            >
                {isLoading && <ChatBoxSkeleton />}
                {!isLoading && messageDatas.length === 0 && (
                    <div className={styles.emptyChat}>No messages yet.</div>
                )}
                {!isLoading && messageDatas.length > 0 && (
                    messageDatas.map((messageData, index) => {
                        const isSystem = isSystemMessage(messageData)
                        const isOwn = userId === messageData.userId

                        if (isSystem) {
                            return (
                                <div key={index} className={styles.systemMessage}>
                                    <span className={styles.systemIcon}>⚡</span>
                                    <span className={styles.systemText}>{messageData.message}</span>
                                </div>
                            )
                        }

                        return (
                            <div key={index} className={`${styles.messageGroup} ${isOwn ? styles.messageGroupOwn : ''}`}>
                                <div className={styles.senderName}>{messageData.sender_username}</div>
                                <div className={styles.message}>{messageData.message}</div>
                            </div>
                        )
                    })
                )}
            </div>
            {withSubmission && (
                <form className={styles.chatInputContainer} onSubmit={(e) => {
                    e.preventDefault()
                    if (!inputRef.current.value) return
                    const message = inputRef.current.value
                    const uid = sessionStorage.getItem('userId')
                    const username = sessionStorage.getItem('username')
                    if (!chatWs.current) {
                        console.error('Chat WebSocket is not connected.')
                        return
                    }
                    sendChatMutation({ userId: uid, username, message, chatWs: chatWs.current })
                    inputRef.current.value = ''
                }}>
                    <input ref={inputRef} className={styles.chatInput} type="text" placeholder="Type a message..." />
                    <PrimaryButton text="Send" />
                </form>
            )}
        </div>
    )
}

export default ChatBox
