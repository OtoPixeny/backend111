const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const users = new Map();
const waitingUsers = [];
let onlineUsers = 0;

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);
  onlineUsers++;
  io.emit('online-users', onlineUsers);

  socket.on('register', (userData) => {
    users.set(socket.id, {
      id: socket.id,
      username: userData.username || 'Guest',
      interests: userData.interests || '',
      partnerId: null,
      isSearching: false
    });
  });

  socket.on('find-partner', () => {
    const user = users.get(socket.id);
    if (!user || user.isSearching || user.partnerId) return;

    // იპოვე პარტნიორი, რომელიც არ არის იგივე მომხმარებელი
    const partnerIndex = waitingUsers.findIndex(id => id !== socket.id);

    if (partnerIndex !== -1) {
      const waitingId = waitingUsers.splice(partnerIndex, 1)[0];
      const partner = users.get(waitingId);
      
      if (!partner || partner.partnerId) { // თუ პარტნიორი აღარ არსებობს
        user.isSearching = true;
        waitingUsers.push(socket.id);
        return;
      }
      
      user.partnerId = waitingId;
      user.isSearching = false;
      partner.partnerId = socket.id;
      partner.isSearching = false;
      
      console.log(`Matched: ${user.username} (${socket.id}) <-> ${partner.username} (${waitingId})`);

      socket.emit('matched', { partnerId: waitingId, username: partner.username, isInitiator: true });
      socket.to(waitingId).emit('matched', { partnerId: socket.id, username: user.username, isInitiator: false });

    } else {
      user.isSearching = true;
      waitingUsers.push(socket.id);
      console.log(`${user.username} is waiting...`);
    }
  });

  socket.on('signal', (data) => {
    socket.to(data.to).emit('signal', { ...data, from: socket.id });
  });

  // <<< მნიშვნელოვანი ცვლილება აქ
  socket.on('message', (message) => {
    const user = users.get(socket.id);
    if (user?.partnerId) {
      // შეტყობინების გადაგზავნისას, მიმღებისთვის გამგზავნი არის 'stranger'
      const relayedMessage = { ...message, sender: 'stranger' };
      socket.to(user.partnerId).emit('message', relayedMessage);
    }
  });

  const cleanupUser = (id) => {
    const user = users.get(id);
    if (!user) return;
    
    // 1. გაუთიშე პარტნიორს
    if (user.partnerId) {
      const partner = users.get(user.partnerId);
      if (partner) {
        partner.partnerId = null;
        partner.isSearching = false;
        socket.to(user.partnerId).emit('partner-disconnected');
        console.log(`Notified partner ${partner.username} of disconnect.`);
      }
    }
    
    // 2. ამოშალე მომლოდინეთა სიიდან
    const waitingIndex = waitingUsers.indexOf(id);
    if (waitingIndex > -1) {
      waitingUsers.splice(waitingIndex, 1);
    }

    // 3. ამოშალე მომხმარებელთა სიიდან
    users.delete(id);
    console.log(`Cleaned up user ${id}`);
  };

  socket.on('skip-partner', () => {
    const user = users.get(socket.id);
    if(user && user.partnerId) {
        cleanupUser(socket.id);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    io.emit('online-users', onlineUsers);
    console.log('Disconnected:', socket.id);
    cleanupUser(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));