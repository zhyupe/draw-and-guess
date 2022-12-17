import { Server } from 'socket.io';
import { getConfig } from './config';
import { getWordList } from './word-manager';

const config = getConfig();

const io = new Server(6075, {
  cors: {
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1280 * 720 * 4,
  path: config.path,
});
const room = 'room';
const words = getWordList();
const emitLink = (...args) =>
  `#!emit|${encodeURIComponent(JSON.stringify(args))}`;

let currentHost: { id: string; nickname: string } | null = null;
let currentData: Buffer | null;
const updateHost = (host: typeof currentHost) => {
  currentHost = host;
  io.to(room).emit('host', host);
};
const store: Record<string, string> = {};

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
  socket.on('chat', (message: string) => {
    console.log('chat [%s (%s)] %s', id, nickname, message);

    if (message.startsWith('/')) {
      const pos = message.indexOf(' ');
      const command = pos === -1 ? message : message.substring(0, pos);
      const arg = pos === -1 ? null : message.substring(pos + 1);

      if (command === '/word') {
        const list = arg && words[arg];
        if (!Array.isArray(list)) {
          socket.emit('chat', {
            from: id,
            nickname,
            message: `Available Word Lists:\n\n${Object.keys(words)
              .map(
                (item) => `* [${item}](${emitLink('chat', `/word ${item}`)})`,
              )
              .join('\n')}`,
            private: true,
          });
          return;
        }

        const result: string[] = [];
        while (result.length < 3) {
          const index = Math.floor(Math.random() * list.length);
          const word = list[index];

          if (!result.includes(word)) {
            result.push(word);
          }
        }

        socket.emit('chat', {
          from: id,
          nickname,
          message: `Your Words:\n\n${result
            .map((item) => `* [${item}](${emitLink('word', arg, item)})`)
            .join('\n')}`,
          private: true,
        });
      }

      return;
    }

    if (store.word && message === store.word) {
      store.word = null;
      updateHost(null);
      io.to(room).emit('chat', {
        from: id,
        nickname,
        message: 'gives the answer.',
        system: true,
      });
    }

    io.to(room).emit('chat', {
      from: id,
      nickname,
      message,
    });
  });

  socket.on('word', (topic, word) => {
    if (currentHost !== null && currentHost.id !== id) {
      socket.emit('chat', {
        from: currentHost.id,
        nickname: currentHost.nickname,
        message: 'is drawing. Please wait.',
        private: true,
      });
      return;
    }

    updateHost({ id, nickname });
    store.word = word;

    socket.emit('chat', {
      from: id,
      nickname,
      message: `You are drawing \n\n**${word}**`,
      private: true,
    });
    socket.to(room).emit('chat', {
      from: id,
      nickname,
      message: `is drawing \n\n**${topic}**`,
      system: true,
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
