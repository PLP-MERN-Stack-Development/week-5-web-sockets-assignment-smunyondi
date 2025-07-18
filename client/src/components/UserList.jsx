import { List, ListItem, ListItemText, Avatar, Typography } from '@mui/material'

const UserList = ({ users, currentUsername, onSelectUser, activeChat }) => {
  // Ensure admin is always in the online users list if online
  const adminOnline = users.some(u => u.username === 'simeon');
  const usersWithAdmin = adminOnline ? users : [...users, { username: 'simeon', id: 'admin-id' }];
  // Move current user to top and label as YOU
  const sorted = [...usersWithAdmin].sort((a, b) => {
    if (a.username === currentUsername) return -1;
    if (b.username === currentUsername) return 1;
    return a.username.localeCompare(b.username);
  });
  return (
    <List dense sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>Online Users</Typography>
      {sorted.map((user) => (
        <ListItem
          key={user.id}
          button
          selected={activeChat.type === 'private' && activeChat.username === user.username}
          onClick={() => user.username !== currentUsername && onSelectUser && onSelectUser(user.username)}
        >
          <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
            {user.username?.charAt(0).toUpperCase()}
          </Avatar>
          <ListItemText primary={user.username === 'simeon' ? 'ADMIN' : (user.username === currentUsername ? 'YOU' : user.username)} />
        </ListItem>
      ))}
    </List>
  )
}

export default UserList