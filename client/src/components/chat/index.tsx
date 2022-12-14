import style from './index.module.css';
import { ChatLog } from './manager';
import { Send } from '../icons/send';
import {
  ReactNode,
  PropsWithChildren,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import ReactMarkdown from 'react-markdown';

const colors = {
  system: '#A6E3E9',
  private: '#FAAB78',
};

function Card({
  color,
  header,
  children,
}: PropsWithChildren<{
  color: string;
  header: ReactNode;
}>) {
  return (
    <div className={style.card} style={{ backgroundColor: color }}>
      <div className={style.cardHeader}>{header}</div>
      <div className={style.cardBody}>{children}</div>
    </div>
  );
}

function Message({ nickname, message }: Pick<ChatLog, 'nickname' | 'message'>) {
  return (
    <>
      <span className={style.author}>{nickname}:</span>{' '}
      <span className={style.messageContent}>
        <ReactMarkdown>{message}</ReactMarkdown>
      </span>
    </>
  );
}

function NormalMessage({
  nickname,
  message,
}: Pick<ChatLog, 'from' | 'nickname' | 'message'>) {
  return (
    <div className={style.message}>
      <Message nickname={nickname} message={message} />
    </div>
  );
}

export function Chat({
  data,
  onSend,
}: {
  data: ChatLog[];
  onSend: (message: string) => void;
}) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const handleSend = useCallback(() => {
    if (input) {
      onSend(input);
      setInput('');
    }
  }, [input]);

  return (
    <div className={style.wrap}>
      <div className={style.log}>
        {data.map((item) => {
          if (item.private || item.system) {
            return (
              <Card
                key={item.id}
                color={item.private ? colors.private : colors.system}
                header="System Message"
              >
                <Message nickname={item.nickname} message={item.message} />
              </Card>
            );
          } else {
            return <NormalMessage key={item.id} {...item} />;
          }
        })}
        <div ref={endRef} />
      </div>
      <div className={style.input}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
              handleSend();
            }
          }}
        />
        <span className={style.send} onClick={handleSend}>
          <Send />
        </span>
      </div>
    </div>
  );
}
