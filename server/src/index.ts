import { Server } from 'socket.io';

const io = new Server(6075, {
  cors: {
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1280 * 720 * 4,
});
const room = 'room';

let currentHost: { id: string; nickname: string } | null = null;
let currentData: Buffer | null;
const updateHost = (host: typeof currentHost) => {
  currentHost = host;
  io.to(room).emit('host', host);
};

io.on('connection', (socket) => {
  // auth
  const id = socket.id;
  let nickname: string | null = null;

  socket.emit('hello');
  socket.once('auth', (arg) => {
    if (typeof arg === 'string') {
      nickname = arg;
      socket.join(room);
      io.to(room).emit('chat', {
        from: id,
        nickname,
        message: 'Joined',
        system: true,
      });

      if (currentData) {
        console.log('conn [%s (%s)]', id, nickname);
        socket.emit('img', currentData);
        socket.emit('host', currentHost);
      }
    } else {
      socket.disconnect(true);
    }
  });

  setTimeout(() => {
    if (nickname === null) {
      socket.emit('sys', 'Failed to authorize in certain seconds');
      socket.disconnect(true);
    }
  }, 3000);

  // disconnect handler
  socket.on('disconnect', (reason) => {
    console.log('disc [%s (%s)] %s', id, nickname, reason);

    if (nickname !== null && currentHost?.id === id) {
      updateHost(null);
    }
  });

  // chat
  socket.on('chat', (message) => {
    console.log('chat [%s (%s)] %s', id, nickname, message);

    io.to(room).emit('chat', {
      from: id,
      nickname,
      message,
    });
  });

  // img
  socket.on('img', (data) => {
    console.log('img  [%s (%s)] %d', id, nickname, data.length);

    if (id !== currentHost?.id) {
      socket.emit('host', currentHost);
      return;
    }

    currentData = data;
    socket.to(room).emit('img', data);
  });

  // host
  socket.on('host', (action) => {
    console.log('host [%s (%s)] %s', id, nickname, action);

    switch (action) {
      case 'request':
        if (currentHost === null) {
          updateHost({ id, nickname });
        }
        break;
      case 'acquire':
        updateHost({ id, nickname });
        break;
      case 'release':
        if (currentHost?.id === id) {
          updateHost(null);
        }
        break;
    }
  });
});
