import { useState, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'

const useChat = () => {
  const { socket } = useSocket()
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({})

  useEffect(() => {
    if (!socket) return;

    // Only append private messages from socket
    const handlePrivateMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (typingUsersObj) => {
      setTypingUsers(typingUsersObj);
    };

    // Remove group message listener
    // socket.on('receive_message', handleMessage);
    socket.on('private_message', handlePrivateMessage);
    socket.on('typing_users', handleTyping);

    return () => {
      // socket.off('receive_message', handleMessage);
      socket.off('private_message', handlePrivateMessage);
      socket.off('typing_users', handleTyping);
    };
  }, [socket])

  // Always send username and replyTo with message
  const sendMessage = (content, username, replyTo) => {
    if (socket && content.trim() && username) {
      socket.emit('send_message', { message: content, sender: username, replyTo })
    }
  }

  const sendPrivateMessage = (to, content, username, replyTo) => {
    if (socket && content.trim() && username) {
      socket.emit('private_message', { to, message: content, sender: username, replyTo })
    }
  }

  const setTyping = (isTyping, chatContext) => {
    if (socket) {
      socket.emit('typing', { isTyping, chatContext });
    }
  }

  return { messages, setMessages, typingUsers, sendMessage, sendPrivateMessage, setTyping }
}

export default useChat