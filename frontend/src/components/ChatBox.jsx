import styles from './../styles/Chatbox.module.css'
import PrimaryButton from './PrimaryButton'
import { useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChatMessages, addChatMessage } from '../services/chat'
import ChatBoxSkeleton from './ChatBoxSkeleton'

function ChatBox({ header, withSubmission = true }) {
    const queryClient = useQueryClient()
    const inputRef = useRef()
    const userId = sessionStorage.getItem('userId')
    const chatContainerRef = useRef()
    const chatWs = useRef(null)
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

    useEffect(() => {
        if (!chatContainerRef.current) return

        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }, [messageDatas])

    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || 'localhost';
        const wsPort = import.meta.env.WS_PORT || '8000';
        if(userId && withSubmission){
            chatWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/chat?user_id=${userId}`)

            chatWs.current.onmessage = (event) => {
                try {
                    const chats = JSON.parse(event.data)

                    queryClient.setQueryData(['chatMessages'], chats)
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error)
                }
            }

            chatWs.onopen = () => {
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
        <div className={styles.chatBoxContainer}>
            <h2>{header}</h2>
            <div className={styles.chats} ref={chatContainerRef}>
                {isLoading && <ChatBoxSkeleton />}
                {!isLoading && messageDatas.length === 0 && (
                    <div className={styles.message}>No messages yet.</div>
                )}
                {!isLoading && messageDatas.length > 0 && (
                    messageDatas.map((messageData, index) => (
                        <div key={index} style={userId == messageData.userId ? { textAlign: 'right' } : null}>
                            <div className={styles.senderName}>{messageData.sender_username}</div>
                            <div className={styles.message}>{messageData.message}</div>
                        </div>
                    )))
                }
            </div>
            {withSubmission && (
                <form className={styles.chatInputContainer} onSubmit={(e) => {
                    e.preventDefault()
                    if (!inputRef.current.value){
                        return
                    }
                    const message = inputRef.current.value
                    const userId = sessionStorage.getItem('userId')
                    const username = sessionStorage.getItem('username')
                    if (!chatWs.current) {
                        console.error('Chat WebSocket is not connected.')
                        return
                    }
                    sendChatMutation({ userId, username, message, chatWs: chatWs.current })
                    inputRef.current.value = ''
                }}>
                    <input ref={inputRef} className={styles.chatInput} type="text" placeholder="Type a message..." style={{width:'auto'}}/>
                    <PrimaryButton text='Send' />
                </form>
            )}
        </div>
    )
}

export default ChatBox;
