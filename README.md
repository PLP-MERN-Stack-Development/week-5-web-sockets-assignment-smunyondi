[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19941396&assignment_repo_type=AssignmentRepo)
# PoTaSQ Chats

PoTaSQ Chats is a real-time MERN + Socket.io chat application supporting group and private messaging, user registration/login, online user list, message persistence, edit/delete/reply features, typing indicators, and robust admin controls. Built for seamless communication and collaboration.

## Project Overview

PoTaSQ Chats is designed to provide a modern, secure, and feature-rich chat experience. It supports:
- Group and private messaging
- Persistent message storage
- User registration, login, and management
- Admin controls for user and chat moderation
- Typing indicators, message edit/delete/reply
- Per-user private conversation deletion
- Robust UI/UX and branding.

## Setup Instructions

1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd <repo-folder>
   ```
2. **Install dependencies (client & server)**
   ```sh
   pnpm install
   ```
3. **Run the application (both client and server)**
   ```sh
   pnpm dev
   ```
   This will start both the React client and Node.js server.
4. **Access the app**
   - Open your browser and go to `http://localhost:3000` (client)
   - The server runs on `http://localhost:3001` by default

## Features Implemented

- Real-time group and private messaging (Socket.io)
- User registration and login (server-side JSON, API endpoints)
- Online users list and registered users list (auto-updating)
- Persistent message storage (`messages.json`)
- Edit, delete, and reply to messages
- Typing indicators
- Per-user private conversation deletion (persistent)
- Admin account (`simeon`/`123456`) with dedicated admin page
- Admin controls: view all chats, see all users, delete users (with confirmation), force logout for deleted users
- UI branding: "PoTaSQ Chats" title, favicon, modern layout
- Notification system for actions (e.g., delete)
- Logout and account deletion (with confirmation)
- Group chat and private chat tabs, searchable user list
- Error handling and robust socket event management

## Screenshots

Below are screenshots showcasing the application's UI and features:

| Login/Register | Inbox | Group Chat | Admin Panel | More |
|---|---|---|---|---|
| ![Login](Screenshots/Screenshot(79).png) | ![Inbox](Screenshots/Screenshot(80).png) | ![Group](Screenshots/Screenshot(81).png) | ![Admin](Screenshots/Screenshot(82).png) | ![More](Screenshots/Screenshot(83).png) |
| ![Inbox](Screenshots/Screenshot(84).png) | ![Inbox](Screenshots/Screenshot(85).png) | ![Group](Screenshots/Screenshot(86).png) | ![Admin](Screenshots/Screenshot(87).png) | ![More](Screenshots/Screenshot(88).png) |
| ![Inbox](Screenshots/Screenshot(89).png) | ![Inbox](Screenshots/Screenshot(90).png) | ![Group](Screenshots/Screenshot(91).png) | ![Admin](Screenshots/Screenshot(92).png) | ![More](Screenshots/Screenshot(93).png) |
| ![Inbox](Screenshots/Screenshot(94).png) | ![Inbox](Screenshots/Screenshot(95).png) | ![Group](Screenshots/Screenshot(96).png) |  |  |

## Future Improvements

- Enhanced styling with TailwindCSS
- User-created groups
- Sending images and videos
- Message encryption
- Improved and secure storage
- More secure authentication

## Author

**Simeon Munyondi**

---

*Not yet deployed. Deployment instructions and URLs will be added once available.*

For any questions or feedback, please contact the author.