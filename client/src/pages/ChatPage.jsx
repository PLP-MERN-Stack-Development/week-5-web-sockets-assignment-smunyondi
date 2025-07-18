import { useState, useRef, useEffect } from 'react'
import { Box, TextField, Button, List, Typography, Tabs, Tab, Divider, ListItem, ListItemText, IconButton } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import Message from '../components/Message'
import UserList from '../components/UserList'
import { useSocket } from '../context/SocketContext'
import useChat from '../hooks/useChat'
import { useNavigate } from 'react-router-dom'

const ChatPage = () => {
  const { socket, isConnected, users, joinChat } = useSocket()
  const { messages, setMessages, typingUsers, sendMessage, sendPrivateMessage, setTyping } = useChat()
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [activeChat, setActiveChat] = useState({ type: 'private', username: null }); // Default to Inbox on load
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  window.debugSocket = socket;

  // Load username from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) setUsername(storedUsername);
  }, []);

  // Fetch chat history on mount
  useEffect(() => {
    if (!username) return;
    fetch(`http://localhost:3001/api/messages?username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(() => {});
  }, [setMessages, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Call joinChat automatically when username is set and socket is available
  useEffect(() => {
    if (username && socket && !socket.connected) {
      console.log("Auto-calling joinChat from useEffect with", username);
      joinChat(username);
    }
  }, [username, socket, joinChat]);

  // Listen for message_edited and message_deleted events
  useEffect(() => {
    if (!socket) return;
    const handleEdited = ({ id, newContent }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, message: newContent, edited: true } : m));
    };
    const handleDeleted = (id) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, message: '' } : m));
    };
    if (socket) {
      socket.on('message_edited', handleEdited);
      socket.on('message_deleted', handleDeleted);
      socket.on('private_message_edited', handleEdited);
      socket.on('private_message_deleted', handleDeleted);
    }
    return () => {
      if (socket) {
        socket.off('message_edited', handleEdited);
        socket.off('message_deleted', handleDeleted);
        socket.off('private_message_edited', handleEdited);
        socket.off('private_message_deleted', handleDeleted);
      }
    };
  }, [socket, setMessages]);

  const handleEdit = (id, newContent) => {
    const msg = messages.find(m => m.id === id);
    if (msg && msg.isPrivate) {
      // For private messages, emit private edit event
      socket.emit('edit_private_message', { id, newContent });
    } else {
      socket.emit('edit_message', { id, newContent });
    }
  };
  const handleDelete = (id) => {
    const msg = messages.find(m => m.id === id);
    if (msg && msg.isPrivate) {
      socket.emit('delete_private_message', id);
    } else {
      socket.emit('delete_message', id);
    }
  };
  const handleReply = (msg) => {
    setReplyTo(msg);
  };

  const handleSend = () => {
    if (activeChat.type === 'group') {
      sendMessage(message, username, replyTo?.id);
    } else if (activeChat.type === 'private') {
      sendPrivateMessage(activeChat.username, message, username, replyTo?.id);
    }
    setMessage('');
    setReplyTo(null);
    setTyping(false, activeChat); // Clear typing indicator after sending
  }

  const handleLogout = () => {
    // Remove username from localStorage
    localStorage.removeItem('username');
    setUsername('');
    setMessages([]);
    // Disconnect socket and remove from online users
    if (socket && socket.connected) {
      socket.emit('user_leave', username);
      socket.disconnect();
    }
    navigate('/');
  }

  // Fetch registered users from server and poll for updates
  useEffect(() => {
    let intervalId;
    const fetchUsers = () => {
      fetch('http://localhost:3001/api/registered-users')
        .then(res => res.json())
        .then(data => setRegisteredUsers(data))
        .catch(() => {});
    };
    fetchUsers(); // initial fetch
    intervalId = setInterval(fetchUsers, 5000); // poll every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Ensure availablePrivateChatUsers is always up-to-date
  useEffect(() => {
    fetch('http://localhost:3001/api/registered-users')
      .then(res => res.json())
      .then(data => setRegisteredUsers(Array.isArray(data) ? data : []));
  }, []);

  // Use online users from context
  const onlineUsernames = users.map(u => u.username);

  // Defensive: ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  // Get users who have had private chats with the current user
  const privateChatUsers = Array.from(new Set(
    safeMessages
      .filter(m => m && m.isPrivate && (m.sender === username || m.receiver === username))
      .map(m => m.sender === username ? m.receiver : m.sender)
      .filter(u => u !== username && u !== 'simeon')
  ));

  // Show all registered users (except self and admin) for starting new private chats
  const availablePrivateChatUsers = registeredUsers.filter(u => u !== username && u !== 'simeon');

  // Filter messages for active chat
  const filteredMessages = activeChat.type === 'group'
    ? safeMessages.filter(m => m && !m.isPrivate)
    : safeMessages.filter(m => m && m.isPrivate && ((m.sender === username && m.receiver === activeChat.username) || (m.sender === activeChat.username && m.receiver === username)));

  // Helper: build a tree of messages with replies as children
  function buildMessageTree(messages) {
    const map = {};
    const roots = [];
    messages.forEach(msg => {
      map[msg.id] = { ...msg, children: [] };
    });
    messages.forEach(msg => {
      if (msg.replyTo && map[msg.replyTo]) {
        map[msg.replyTo].children.push(map[msg.id]);
      } else {
        roots.push(map[msg.id]);
      }
    });
    return roots;
  }

  // Helper: recursively render messages with indentation
  function renderMessages(msgs, level = 0) {
    return msgs.map((msg, i) => [
      <Message
        key={msg.id}
        message={msg}
        currentUser={{ username }}
        onEdit={handleEdit}
        // Restore delete button for all messages
        onDelete={handleDelete}
        onReply={handleReply}
        messages={messages}
        level={level}
      />,
      msg.children && msg.children.length > 0 ? renderMessages(msg.children, level + 1) : null
    ]);
  }

  // Typing indicator logic for per-chat context
  const getTypingUsersForActiveChat = () => {
    if (activeChat.type === 'group') {
      return Object.entries(typingUsers)
        .filter(([u, ctx]) => ctx && ctx.type === 'group' && u !== username)
        .map(([u]) => u);
    } else if (activeChat.type === 'private') {
      return Object.entries(typingUsers)
        .filter(([u, ctx]) => ctx && ctx.type === 'private' && ((ctx.username === username && u === activeChat.username) || (ctx.username === activeChat.username && u === username)) && u !== username)
        .map(([u]) => u);
    }
    return [];
  };

  // Listen for 'force_logout' event
  useEffect(() => {
    const handleForceLogout = () => {
      localStorage.removeItem('username');
      navigate('/');
    };
    if (socket) {
      socket.on('force_logout', handleForceLogout);
    }
    return () => {
      if (socket) {
        socket.off('force_logout', handleForceLogout);
      }
    };
  }, [socket, navigate]);

  // State for delete private chat confirmation
  const [deleteChatUser, setDeleteChatUser] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');

  // Function to delete all private messages with a user (persistent)
  const handleDeletePrivateChat = async (otherUser) => {
    if (!window.confirm(`Are you sure you want to delete all private messages with ${otherUser}? This cannot be undone.`)) return;
    // Call server to mark this chat as deleted for this user
    await fetch('http://localhost:3001/api/delete-private-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otherUser })
    });
    // Refetch messages from server
    fetch(`http://localhost:3001/api/messages?username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []));
    setAlertMsg(`All private messages with ${otherUser} have been deleted.`);
    setActiveChat({ type: 'private', username: null });
  };

  // Update message fetching to include username
  useEffect(() => {
    fetch(`http://localhost:3001/api/messages?username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [setMessages, username]);

  useEffect(() => {
    if (!socket) return;
    const handleMessageUpdate = (msg) => {
      // If null, refetch messages from server
      if (msg === null) {
        fetch(`http://localhost:3001/api/messages?username=${encodeURIComponent(username)}`)
          .then(res => res.json())
          .then(data => setMessages(Array.isArray(data) ? data : []));
      } else if (msg) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('receive_message', handleMessageUpdate);
    return () => {
      socket.off('receive_message', handleMessageUpdate);
    };
  }, [socket, setMessages, username]);

  // Show alert for 1 second then hide
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  if (!username) {
    return (
      <Box sx={{ p: 2, maxWidth: 400, mx: 'auto', mt: 4 }}>
        <TextField
          fullWidth
          label="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              console.log("Calling joinChat from ChatPage with", username);
              joinChat(username);
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => {
            console.log("Calling joinChat from ChatPage with", username);
            joinChat(username);
          }}
          sx={{ mt: 2 }}
          disabled={!username.trim()}
        >
          Join Chat
        </Button>
      </Box>
    )
  }

  return (
    <>
      {/* Connection status dot */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: socket.connected ? 'limegreen' : 'gray',
        border: '2px solid white',
        boxShadow: '0 0 4px #0003',
      }} title={socket.connected ? 'Connected' : 'Disconnected'} />
      {/* Logout button - move to bottom left */}
      <Button
        variant="outlined"
        size="small"
        sx={{ position: 'fixed', bottom: 60, left: 16, zIndex: 9999 }}
        onClick={handleLogout}
      >
        Logout
      </Button>
      <Button
        variant="outlined"
        color="error"
        sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999 }}
        onClick={() => {
          if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            fetch('http://localhost:3001/api/delete-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  alert('Account deleted successfully.');
                  localStorage.removeItem('username');
                  setUsername('');
                  setMessages([]);
                  if (socket && socket.connected) {
                    socket.emit('user_leave', username);
                    socket.disconnect();
                  }
                  navigate('/');
                } else {
                  alert(data.error || 'Failed to delete account.');
                }
              });
          }
        }}
      >
        Delete My Account
      </Button>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Box sx={{ width: 240, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>Online Users</Typography>
          <List dense>
            {users.map((u, idx) => (
              <ListItem key={`online-${u.username}-${idx}`}>
                <ListItemText
                  primary={
                    <span>
                      {u.username === username ? `YOU-${username}` : (u.username === 'simeon' ? 'ADMIN' : u.username)}
                      <span style={{ display: 'inline-block', marginLeft: 8, width: 10, height: 10, borderRadius: '50%', background: 'limegreen', verticalAlign: 'middle' }} />
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>Registered Users</Typography>
          <List dense>
            {registeredUsers.map((u, idx) => (
              <ListItem key={`reg-${u}-${idx}`}>
                <ListItemText primary={u === username ? `YOU-${username}` : (u === 'simeon' ? 'ADMIN' : u)} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Update the main heading/title to 'PoTaSQ Chats' */}
          <Typography variant="h4" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>PoTaSQ Chats</Typography>
          <Tabs value={activeChat.type} onChange={(e, v) => setActiveChat(v === 'group' ? { type: 'group' } : { type: 'private', username: activeChat.username })}>
            <Tab label="Inbox" value="private" />
            <Tab label="Groups" value="group" />
          </Tabs>
          <Divider />
          {/* Private chat user selection and navigation */}
          {activeChat.type === 'private' && (
            <Box sx={{ p: 2 }}>
              {activeChat.username ? (
                <IconButton sx={{ mb: 2 }} onClick={() => setActiveChat({ type: 'private', username: null })}>
                  <span style={{ fontSize: 24 }}>&larr;</span>
                </IconButton>
              ) : (
                <TextField
                  fullWidth
                  label="Search users by username"
                  variant="outlined"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}
              {/* Button to start a new private chat */}
              {!activeChat.username && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setShowNewChat(true)}
                    sx={{ width: '100%' }}
                  >
                    Start New Private Chat
                  </Button>
                </Box>
              )}
              {/* List of users with prior private messaging, filtered by search and online status */}
              {!activeChat.username && !showNewChat && (
                <List>
                  {privateChatUsers.filter(u => u.toLowerCase().includes(searchUser.toLowerCase())).map((u, idx) => (
                    <ListItem button onClick={() => setActiveChat({ type: 'private', username: u })} selected={activeChat.username === u} key={`private-${u}-${idx}`}>
                      <ListItemText
                        primary={
                          <span>
                            {u}
                            {onlineUsernames.includes(u) && (
                              <span style={{ display: 'inline-block', marginLeft: 8, width: 10, height: 10, borderRadius: '50%', background: 'limegreen', verticalAlign: 'middle' }} />
                            )}
                          </span>
                        }
                      />
                      {/* Restore Delete Conversation button for private messaging */}
                      <IconButton edge="end" aria-label="delete" onClick={e => { e.stopPropagation(); handleDeletePrivateChat(u); }}>
                        <span style={{ color: 'red', fontWeight: 'bold', fontSize: 18 }}>&#128465;</span>
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              )}
              {/* New chat user selection dialog/list with online status */}
              {!activeChat.username && showNewChat && (
                <Box>
                  <TextField
                    fullWidth
                    label="Search users by username"
                    variant="outlined"
                    value={newChatSearch}
                    onChange={e => setNewChatSearch(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Select a user to start a new private chat:</Typography>
                  <List>
                    {availablePrivateChatUsers.filter(u => u.toLowerCase().includes(newChatSearch.toLowerCase())).map((u, idx) => (
                      <ListItem button onClick={() => { setActiveChat({ type: 'private', username: u }); setShowNewChat(false); }} key={`newchat-${u}-${idx}`}>
                        <ListItemText
                          primary={
                            <span>
                              {u}
                              {onlineUsernames.includes(u) && (
                                <span style={{ display: 'inline-block', marginLeft: 8, width: 10, height: 10, borderRadius: '50%', background: 'limegreen', verticalAlign: 'middle' }} />
                              )}
                            </span>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button variant="text" sx={{ mt: 1 }} onClick={() => setShowNewChat(false)}>Cancel</Button>
                </Box>
              )}
            </Box>
          )}
          {/* Chat messages */}
          {activeChat.type === 'group' || (activeChat.type === 'private' && activeChat.username) ? (
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <List>
                {renderMessages(buildMessageTree(filteredMessages))}
                <div ref={messagesEndRef} />
              </List>
              {getTypingUsersForActiveChat().length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {getTypingUsersForActiveChat().join(', ')} {getTypingUsersForActiveChat().length > 1 ? 'are' : 'is'} typing...
                </Typography>
              )}
            </Box>
          ) : null}
          {replyTo && (
            <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1 }}>
              Replying to: {replyTo.sender}: {replyTo.message}
              <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
            </Typography>
          )}
          {(activeChat.type === 'group' || (activeChat.type === 'private' && activeChat.username)) && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setTyping(!!e.target.value, activeChat);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  onBlur={() => setTyping(false, activeChat)}
                  placeholder="Type a message..."
                />
                <Button 
                  variant="contained" 
                  onClick={handleSend}
                  endIcon={<SendIcon />}
                  disabled={!message.trim()}
                >
                  Send
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      {/* Alert for deleted chat */}
      {alertMsg && (
        <Box sx={{ position: 'fixed', top: 80, right: 24, zIndex: 9999 }}>
          <Typography variant="body2" sx={{ bgcolor: 'success.light', color: 'success.contrastText', p: 2, borderRadius: 2, boxShadow: 2 }}>
            <span style={{ marginRight: 8, fontSize: 18 }}>🗑️</span>
            {alertMsg}
          </Typography>
        </Box>
      )}
      {console.log("socket in ChatPage:", socket)}
    </>
  )
}

export default ChatPage