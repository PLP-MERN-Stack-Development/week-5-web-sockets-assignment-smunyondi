import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  console.log("SocketProvider mounted");
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    console.log("Socket useEffect running");
    const newSocket = io('http://localhost:3001', {
      autoConnect: false,
      transports: ['websocket'], // Force WebSocket transport for testing
      withCredentials: true
    });
    console.log("Socket created:", newSocket);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server', newSocket.id, 'Transport:', newSocket.io.engine.transport.name);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('user_list', (userList) => {
      setUsers(userList);
    });

    return () => {
      newSocket.disconnect();
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('user_list');
    };
  }, []);

  const joinChat = (username) => {
    console.log("joinChat called with", username, "socket:", socket);
    if (socket && !socket.connected) {
      socket.connect();
      socket.emit('user_join', username);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, users, joinChat }}>
      {children}
    </SocketContext.Provider>
  );
};