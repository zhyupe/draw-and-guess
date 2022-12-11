import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { Canvas, CanvasData, CanvasRefObject } from './components/canvas';
import { PopoverPicker } from './components/colorpicker';
import { SizePicker } from './components/sizepicker';
import { io, Socket } from 'socket.io-client';
import { Clear } from './components/icons/clear';
import { Chat } from './components/chat';
import { useChatLogger } from './components/chat/manager';
import { Connect } from './components/icons/connect';
import { Disconnect } from './components/icons/disconnect';
import { useCanvasHistory } from './components/history';

function App() {
  const [color, setColor] = useState('#000');
  const [size, setSize] = useState(2);
  const [host, setHost] = useState<{ id: string; nickname: string } | null>(
    null,
  );
  const chatLogger = useChatLogger();

  const canvas = useRef<CanvasRefObject>(null);
  const ref = useRef<Socket>();
  const store = useCanvasHistory((data) => {
    canvas.current?.set(data);
    ref.current?.emit('img', data);
  });

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const server = new URL(query.get('server') || 'http://127.0.0.1:6075');

    let nickname = localStorage.getItem('canvas_nickname');
    while (!nickname) {
      nickname = prompt('Please enter your nickname');
      localStorage.setItem('canvas_nickname', nickname!);
    }

    const socket = io(`${server.protocol}//${server.host}`, {
      path: server.pathname === '/' ? undefined : server.pathname,
    });

    socket.on('connect', () => {
      ref.current = socket;
      socket.emit('auth', nickname);
    });
    socket.on('img', (data) => {
      canvas.current?.set(data);
    });
    socket.on('chat', (item) => chatLogger.push(item));
    socket.on('host', setHost);

    return () => {
      ref.current = undefined;
      socket.close();
    };
  }, []);

  const emitChat = useCallback((message: string) => {
    ref.current?.emit('chat', message);
  }, []);

  const emitImage = useCallback((data: CanvasData, shouldSave?: boolean) => {
    ref.current?.emit('img', data);
    if (shouldSave) {
      store.push(data);
    }
  }, []);

  const isHost = useMemo(
    () => !!ref.current?.id && host?.id === ref.current.id,
    [host, ref.current?.id],
  );

  return (
    <div className="app">
      <main>
        <div className="drawing-canvas">
          <Canvas
            ref={canvas}
            width={1280}
            height={720}
            lineWidth={size}
            lineColor={color}
            drawing={isHost}
            onChange={emitImage}
          />
        </div>
        <div className="drawing-tool">
          <div style={{ visibility: isHost ? 'visible' : 'hidden' }}>
            <PopoverPicker color={color} onChange={setColor} />
            <span className="pipe" />
            <SizePicker color={color} value={size} onChange={setSize} />
            <span className="pipe" />
            {store.node}
          </div>
          <div>
            {host ? (
              <span>{host.nickname} is drawing</span>
            ) : (
              <>
                <span>Nobody drawing</span>{' '}
                <button
                  title="Request"
                  style={{ marginLeft: 5 }}
                  onClick={() => ref.current?.emit('host', 'request')}
                >
                  <Connect />
                </button>
              </>
            )}
            {isHost ? (
              <>
                <button
                  title="Clear"
                  style={{ marginLeft: 5 }}
                  onClick={() => canvas.current?.clear()}
                >
                  <Clear />
                </button>
                <button
                  title="Release"
                  style={{ marginLeft: 5 }}
                  onClick={() => ref.current?.emit('host', 'release')}
                >
                  <Disconnect />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <section>
        <Chat data={chatLogger.log} onSend={emitChat} />
      </section>
    </div>
  );
}

export default App;
