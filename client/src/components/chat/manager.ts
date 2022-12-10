import { useCallback, useState } from 'react';

export interface ChatLog {
  id: string;
  from: string;
  nickname: string;
  message: string;
  system?: boolean;
  private?: boolean;
}

let index = 0;
export function useChatLogger(maxCount = 100) {
  const [log, setLog] = useState<ChatLog[]>([]);
  const push = useCallback((item: Omit<ChatLog, 'id'>) => {
    setLog((prev) => {
      const next = [
        ...prev,
        {
          id: `${++index}`,
          ...item,
        },
      ];

      return next.slice(-maxCount);
    });
  }, []);

  return {
    log,
    push,
  };
}
