import { useEffect, useState, useRef } from 'react';
import { Box, Typography, List, Button, Divider, Tabs, Tab, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import Message from '../components/Message';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';

const ChatAdminPage = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('group');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all messages from the server and poll for updates
    const fetchMessages = () => {
      fetch('http://localhost:3001/api/messages')
        .then(res => res.json())
        .then(data => setMessages(data));
    };
    fetchMessages(); // initial fetch
    const interval = setInterval(fetchMessages, 2000); // poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch registered users from server
  useEffect(() => {
    const updateUsers = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/registered-users');
        const userList = await res.json();
        setUsers(userList.map(username => ({ username })));
      } catch {}
    };
    updateUsers();
    window.addEventListener('storage', updateUsers);
    // Poll every 500ms for changes from other tabs or registration
    const interval = setInterval(updateUsers, 500);
    return () => {
      window.removeEventListener('storage', updateUsers);
      clearInterval(interval);
    };
  }, []);

  // Filter messages for group or private
  const filteredMessages = activeTab === 'group'
    ? messages.filter(m => !m.isPrivate)
    : messages.filter(m => m.isPrivate);

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

  function renderMessages(msgs, level = 0) {
    return msgs.map((msg, i) => [
      <Message
        key={msg.id}
        message={msg}
        currentUser={{ username: 'simeon' }}
        onEdit={() => {}}
        onDelete={() => {}}
        onReply={() => {}}
        messages={messages}
        level={level}
      />,
      msg.children && msg.children.length > 0 ? renderMessages(msg.children, level + 1) : null
    ]);
  }

  // Only allow access if admin (permanent, not in localStorage)
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username !== 'simeon') {
      navigate('/');
    }
  }, [navigate]);

  // Helper to delete a single user (except admin)
  const deleteUserFromServer = async (username) => {
    try {
      await fetch('http://localhost:3001/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
    } catch {}
  };
  const handleDeleteUser = async (username) => {
    if (username === 'simeon') return;
    await deleteUserFromServer(username);
    setConfirmDelete(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Admin Chat Management</Typography>
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
        <Tab label="Group Chats" value="group" />
        <Tab label="Private Chats" value="private" />
      </Tabs>
      <Divider sx={{ my: 2 }} />
      <List>
        {renderMessages(buildMessageTree(filteredMessages))}
        <div ref={messagesEndRef} />
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6">Registered Users</Typography>
      <List>
        <ListItem sx={{ bgcolor: 'warning.light', fontWeight: 'bold' }}>
          <ListItemText primary="ADMIN" />
        </ListItem>
        {users.filter(u => u.username !== 'simeon').map(u => (
          <ListItem key={u.username} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => setConfirmDelete(u.username)}>
              <DeleteIcon />
            </IconButton>
          }>
            <ListItemText primary={u.username === 'simeon' ? 'ADMIN' : u.username} />
          </ListItem>
        ))}
      </List>
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete user '{confirmDelete}'?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" onClick={() => handleDeleteUser(confirmDelete)}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Button
        variant="outlined"
        color="error"
        sx={{ mb: 2 }}
        onClick={() => {
          localStorage.removeItem('username');
          window.location.href = '/';
        }}
      >
        Logout
      </Button>
    </Box>
  );
};

export default ChatAdminPage;
