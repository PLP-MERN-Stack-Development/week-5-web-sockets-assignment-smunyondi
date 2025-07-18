import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, TextField, Button, Typography } from '@mui/material'
import { useSocket } from '../socket/socket';
import axios from 'axios';

const HomePage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { socket } = useSocket();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    // Permanent admin account logic
    if (username === 'simeon' && password === '123456') {
      localStorage.setItem('username', username)
      // Emit user_join for admin using context socket
      if (socket && socket.connected) {
        socket.emit('user_join', username);
      }
      navigate('/chatAdmin')
      return
    }
    try {
      await axios.post('http://localhost:3001/api/login', { username, password });
      setError('')
      localStorage.setItem('username', username)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      maxWidth: 400,
      mx: 'auto',
      p: 2
    }}>
      <Typography
        variant="h6"
        sx={{ mb: 2, textAlign: 'center', color: 'primary.main', fontWeight: 500 }}
      >
        Welcome to PoTaSQ Chats! Connect, chat, and collaborate in real time.
      </Typography>
      <Typography
        variant="h4"
        sx={{ mt: 2, mb: 2, textAlign: 'center', color: 'primary.main', fontWeight: 700 }}
      >
        PoTaSQ Chats
      </Typography>
      {location.state?.registered && (
        <Typography color="success.main" sx={{ mb: 2 }}>
          Registration successful! Please log in.
        </Typography>
      )}
      <TextField
        fullWidth
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Button
        fullWidth
        variant="contained"
        onClick={handleLogin}
        disabled={!username.trim() || !password.trim()}
      >
        Login
      </Button>
      <Button
        fullWidth
        variant="text"
        sx={{ mt: 1 }}
        onClick={() => navigate('/register')}
      >
        Don't have an account? Register
      </Button>
    </Box>
  )
}

export default HomePage