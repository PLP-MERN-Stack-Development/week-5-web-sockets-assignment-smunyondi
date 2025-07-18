import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, Button, Typography } from '@mui/material'
import axios from 'axios'

const RegisterPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    try {
      const res = await axios.post('http://localhost:3001/api/register', { username, password })
      setError('')
      navigate('/', { state: { registered: true, username } })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
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
      {/* Removed: <Typography variant="h4" component="h1" gutterBottom>Register for SocketChat</Typography> */}
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', color: 'primary.main' }}>
        Welcome to PoTaSQ Chats! Create your account and start chatting instantly.
      </Typography>
      <Typography variant="h4" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>PoTaSQ Chats</Typography>
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
        onClick={handleRegister}
        disabled={!username.trim() || !password.trim()}
      >
        Register
      </Button>
      <Button
        fullWidth
        variant="text"
        sx={{ mt: 1 }}
        onClick={() => navigate('/')}
      >
        Already have an account? Login
      </Button>
    </Box>
  )
}

export default RegisterPage
