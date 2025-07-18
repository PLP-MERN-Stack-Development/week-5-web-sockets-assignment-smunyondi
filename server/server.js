console.log('--- SERVER FILE LOADED ---');
// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for debugging
    methods: ['GET', 'POST']
  }
  // transports option removed for fallback
});

// Enable CORS and JSON middleware
app.use(cors());
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
// Change users to be tracked by username, not socket id
const users = {}; // { username: { id: socket.id, username, online: true } }
const socketToUsername = {}; // { socket.id: username }
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const DELETED_USERS_FILE = path.join(__dirname, 'deleted_users.json');
const DELETED_CONVERSATIONS_FILE = path.join(__dirname, 'deleted_conversations.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const typingUsers = {};

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadDeletedUsers() {
  try {
    return JSON.parse(fs.readFileSync(DELETED_USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveDeletedUsers(list) {
  fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(list, null, 2));
}

function loadDeletedConversations() {
  try {
    return JSON.parse(fs.readFileSync(DELETED_CONVERSATIONS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveDeletedConversations(obj) {
  fs.writeFileSync(DELETED_CONVERSATIONS_FILE, JSON.stringify(obj, null, 2));
}

function loadMessages() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveMessages(msgs) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2));
}

// Load messages from file on startup
let messages = loadMessages();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  // Log the transport type for this connection
  console.log('Transport type for', socket.id + ':', socket.conn.transport.name);

  // Handle user joining
  socket.on('user_join', (username) => {
    // Blacklist check for deleted users
    const deletedUsers = loadDeletedUsers();
    if (deletedUsers.includes(username)) {
      socket.emit('force_logout');
      socket.disconnect(true);
      console.log(`Blocked deleted user ${username} from joining chat.`);
      return;
    }
    // Mark user as online and map socket id to username
    const displayName = username === 'simeon' ? 'ADMIN' : username;
    users[username] = { id: socket.id, username, online: true };
    socketToUsername[socket.id] = username;
    io.emit('user_list', Object.values(users).filter(u => u.online));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${displayName} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: messageData.sender || users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      replyTo: messageData.replyTo || null
    };
    messages.push(message);
    saveMessages(messages);
    if (messages.length > 100) messages.shift();
    io.emit('receive_message', message);
  });

  // Handle typing indicator
  socket.on('typing', ({ isTyping, chatContext }) => {
    const username = socketToUsername[socket.id];
    if (username && users[username]) {
      if (isTyping) {
        typingUsers[username] = chatContext;
      } else {
        delete typingUsers[username];
      }
      io.emit('typing_users', typingUsers);
    }
  });

  // Handle private messages
  socket.on('private_message', ({ to, message, sender, replyTo }) => {
    const messageData = {
      id: Date.now(),
      sender: sender || users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      receiver: to,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      replyTo: replyTo || null
    };
    // Save private message for chat history
    messages.push(messageData);
    saveMessages(messages);
    socket.to(users[to]?.id).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle edit message
  socket.on('edit_message', ({ id, newContent }) => {
    const username = socketToUsername[socket.id];
    const msg = messages.find(m => m.id === id);
    if (msg && msg.sender === username) {
      msg.message = newContent;
      msg.edited = true;
      saveMessages(messages);
      io.emit('message_edited', { id, newContent });
    }
  });

  // Handle delete message
  socket.on('delete_message', (id) => {
    const username = socketToUsername[socket.id];
    const msg = messages.find(m => m.id === id && m.sender === username);
    if (msg) {
      msg.deleted = true;
      msg.message = '';
      saveMessages(messages);
      io.emit('message_deleted', id);
    }
  });

  // Handle edit private message
  socket.on('edit_private_message', ({ id, newContent }) => {
    const username = socketToUsername[socket.id];
    const msg = messages.find(m => m.id === id && m.sender === username && m.isPrivate);
    if (msg) {
      msg.message = newContent;
      msg.edited = true;
      saveMessages(messages);
      io.emit('private_message_edited', { id, newContent });
    }
  });

  // Handle delete private message
  socket.on('delete_private_message', (id) => {
    const username = socketToUsername[socket.id];
    const msg = messages.find(m => m.id === id && m.sender === username && m.isPrivate);
    if (msg) {
      msg.deleted = true;
      msg.message = '';
      saveMessages(messages);
      io.emit('private_message_deleted', id);
    }
  });

  // Handle delete all private messages between two users
  socket.on('delete_private_chat', async ({ username, otherUser }) => {
    const before = messages.length;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.isPrivate && ((m.sender === username && m.receiver === otherUser) || (m.sender === otherUser && m.receiver === username))) {
        messages.splice(i, 1);
      }
    }
    saveMessages(messages);
    const after = messages.length;
    console.log(`Deleted ${before - after} private messages between ${username} and ${otherUser}`);
    io.to(users[username]?.id).emit('receive_message', null); // trigger refetch for deleter
    // Notify the other user if online
    if (users[otherUser]?.online && users[otherUser]?.id) {
      io.to(users[otherUser].id).emit('private_chat_deleted_by_other', { username });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = socketToUsername[socket.id];
    const displayName = username === 'simeon' ? 'ADMIN' : username;
    if (username && users[username]) {
      users[username].online = false;
      io.emit('user_left', { username, id: socket.id });
      console.log(`${displayName} left the chat`);
    }
    delete socketToUsername[socket.id];
    // Don't delete users[username] so they persist until explicit logout
    delete typingUsers[username];
    io.emit('user_list', Object.values(users).filter(u => u.online));
    io.emit('typing_users', Object.keys(typingUsers));
  });
});

// API routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username === 'simeon') return res.status(400).json({ error: 'Reserved username' });
  const deletedUsers = loadDeletedUsers();
  if (deletedUsers.includes(username)) return res.status(400).json({ error: 'This account has been deleted by admin and cannot be re-registered.' });
  const users = loadUsers();
  if (users[username]) return res.status(400).json({ error: 'Username already exists' });
  users[username] = { password };
  saveUsers(users);
  console.log(`✅ ${username} registered and created an account`);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'simeon' && password === '123456') return res.json({ success: true });
  const deletedUsers = loadDeletedUsers();
  if (deletedUsers.includes(username)) return res.status(400).json({ error: 'This account has been deleted by admin and cannot be used.' });
  const users = loadUsers();
  if (!users[username]) return res.status(400).json({ error: 'User does not exist' });
  if (users[username].password !== password) return res.status(400).json({ error: 'Invalid password' });
  res.json({ success: true });
});

app.get('/api/registered-users', (req, res) => {
  const users = loadUsers();
  res.json(Object.keys(users));
});

app.get('/api/messages', (req, res) => {
  const username = req.query.username;
  let filtered = messages;
  if (username) {
    const deleted = loadDeletedConversations();
    const deletedWith = deleted[username] || [];
    filtered = messages.filter(m => {
      if (m.deleted) return false; // Exclude deleted messages
      if (!m.isPrivate) return true;
      // Only hide messages strictly between the requesting user and the deleted user
      const otherUser = m.sender === username ? m.receiver : m.sender;
      const isStrictlyBetween = (m.sender === username && m.receiver === otherUser) || (m.sender === otherUser && m.receiver === username);
      // Hide only if the requesting user has deleted the other user AND the message is strictly between them
      return !(deletedWith.includes(otherUser) && isStrictlyBetween);
    });
    // Debug log: print filtered messages for this user
    console.log(`Filtered messages for ${username}:`, filtered);
  }
  res.json(filtered);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// Add a server API endpoint to delete a user account, except the admin.
app.post('/api/delete-user', (req, res) => {
  const { username } = req.body;
  if (!username || username === 'simeon') return res.status(400).json({ error: 'Invalid user' });
  const fileUsers = loadUsers();
  if (!fileUsers[username]) return res.status(400).json({ error: 'User does not exist' });
  delete fileUsers[username];
  saveUsers(fileUsers);
  // Add to deleted users blacklist
  const deletedUsers = loadDeletedUsers();
  if (!deletedUsers.includes(username)) {
    deletedUsers.push(username);
    saveDeletedUsers(deletedUsers);
  }
  // Force logout for deleted user if online (check in-memory users object)
  if (users[username] && users[username].id && io.sockets.sockets.get(users[username].id)) {
    io.sockets.sockets.get(users[username].id).emit('force_logout');
    io.sockets.sockets.get(users[username].id).disconnect(true);
  }
  console.log(`❌ ${username} account deleted by ADMIN`);
  res.json({ success: true });
});

// API to mark a private chat as deleted for a user
app.post('/api/delete-private-chat', (req, res) => {
  const { username, otherUser, socketId } = req.body;
  if (!username || !otherUser) return res.status(400).json({ error: 'Missing username or otherUser' });
  const deleted = loadDeletedConversations();
  if (!deleted[username]) deleted[username] = [];
  if (!deleted[username].includes(otherUser)) deleted[username].push(otherUser);
  saveDeletedConversations(deleted);
  // Notify only the deleting user's socket to refetch
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.sockets.sockets.get(socketId).emit('private_chat_deleted');
  }
  res.json({ success: true });
});

// Debug endpoint to view all messages
app.get('/api/debug-messages', (req, res) => {
  res.json(messages);
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// WebSocket upgrade request listener
server.on('upgrade', (req, socket, head) => {
  console.log('WebSocket upgrade request received');
});

// Start server
const PORT = 3001; // Changed from 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


module.exports = { app, server, io };