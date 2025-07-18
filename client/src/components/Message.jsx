import { ListItem, ListItemText, Avatar, Typography, IconButton, TextField, Box, Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import ReplyIcon from '@mui/icons-material/Reply'
import { useState } from 'react'

const Message = ({ message, currentUser, onEdit, onDelete, onReply, messages, level = 0 }) => {
  const isCurrentUser = message.sender === currentUser?.username
  const isSystem = message.system
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.message)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Find the replied-to message
  const repliedMsg = message.replyTo ? messages?.find(m => m.id === message.replyTo) : null;

  // Show deleted message bubble for everyone if message.deleted is true
  if (message.deleted) {
    return (
      <ListItem sx={{ justifyContent: isCurrentUser ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 1, pl: 2 + level * 4 }}>
        <ListItemText
          primary={isSystem ? 'System' : (isCurrentUser ? 'YOU' : message.sender)}
          secondary={<Typography variant="caption" color="text.secondary">Deleted Message</Typography>}
          primaryTypographyProps={{
            color: isSystem ? 'text.secondary' : 'text.primary',
            fontWeight: 'bold',
            textAlign: isCurrentUser ? 'right' : 'left'
          }}
          sx={{
            bgcolor: 'background.paper',
            p: 1,
            borderRadius: 2,
            maxWidth: '70%'
          }}
        />
      </ListItem>
    );
  }

  const handleEdit = () => {
    setEditing(true)
    setEditValue(message.message)
  }
  const handleEditSave = () => {
    if (editValue.trim() && editValue !== message.message) {
      onEdit && onEdit(message.id, editValue)
    }
    setEditing(false)
  }
  const handleEditCancel = () => {
    setEditing(false)
    setEditValue(message.message)
  }

  return (
    <>
      <ListItem sx={{
        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-start',
        gap: 1,
        pl: 2 + level * 4 // Indent replies
      }}>
        {!isCurrentUser && !isSystem && (
          <Avatar sx={{ width: 32, height: 32 }}>
            {message.sender?.charAt(0).toUpperCase()}
          </Avatar>
        )}
        <Box sx={{ width: '100%' }}>
          {repliedMsg && (
            <Paper variant="outlined" sx={{ p: 0.5, mb: 0.5, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="primary">
                Reply to {repliedMsg.sender}:
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {repliedMsg.message}
              </Typography>
            </Paper>
          )}
          <ListItemText
            primary={isSystem ? 'System' : (isCurrentUser ? `YOU-${currentUser?.username}` : message.sender)}
            secondary={editing ? (
              <span>
                <TextField
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  size="small"
                  sx={{ width: '100%' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave()
                    if (e.key === 'Escape') handleEditCancel()
                  }}
                  autoFocus
                />
                <IconButton size="small" onClick={handleEditSave}><DoneIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={handleEditCancel}><CloseIcon fontSize="small" /></IconButton>
              </span>
            ) : (
              <span>
                {message.message} {message.edited && <Typography variant="caption" color="text.secondary">(edited)</Typography>}
              </span>
            )}
            primaryTypographyProps={{
              color: isSystem ? 'text.secondary' : 'text.primary',
              fontWeight: 'bold',
              textAlign: isCurrentUser ? 'right' : 'left'
            }}
            secondaryTypographyProps={{
              textAlign: isCurrentUser ? 'right' : 'left'
            }}
            sx={{
              bgcolor: isSystem ? 'transparent' : (isCurrentUser ? 'primary.light' : 'background.paper'),
              p: 1,
              borderRadius: 2,
              maxWidth: '70%'
            }}
          />
          {isCurrentUser && !isSystem && !editing && !message.deleted && (
            <>
              <IconButton size="small" onClick={handleEdit}><EditIcon fontSize="small" /></IconButton>
              {/* Restore delete button for all messages sent by current user */}
              {onDelete && isCurrentUser && (
                <IconButton edge="end" aria-label="delete" onClick={() => setShowDeleteConfirm(true)} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
          {!isSystem && (
            <IconButton size="small" onClick={() => onReply && onReply(message)}><ReplyIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </ListItem>
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this message?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button color="error" onClick={() => { setShowDeleteConfirm(false); onDelete && onDelete(message.id); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Message