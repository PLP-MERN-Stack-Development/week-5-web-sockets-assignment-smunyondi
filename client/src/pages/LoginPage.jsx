import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, TextField, Button, Typography } from '@mui/material'

const usersKey = 'demo_users';

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    const users = JSON.parse(localStorage.getItem(usersKey) || '{}')
    if (!users[username] || users[username].password !== password) {
      setError('Invalid username or password')
      return
    }
    setError('')
    localStorage.setItem('username', username)
    navigate('/chat')
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
      <Typography variant="h4" component="h1" gutterBottom>
        Login to SocketChat
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
        onClick={() => navigate('/')}
      >
        Don't have an account? Register
      </Button>
    </Box>
  )
}

export default LoginPage