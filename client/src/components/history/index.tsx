import { useState } from 'react';
import { CanvasData } from '../canvas';
import { ArrowForward } from '../icons/arrow-forward';
import { ArrowBack } from '../icons/arrow-back';

const historyLength = 10;
export function useCanvasHistory(handler: (data: CanvasData) => void) {
  const [store, setStore] = useState<CanvasData[]>([]);
  const [cursor, setCursor] = useState(0);

  // 0 = last
  console.log(`[history] store: ${store.length}, cursor: ${cursor}`);
  const actualCursor = store.length - 1 + cursor;
  const canForward = actualCursor < store.length - 1;
  const canBack = actualCursor > 0;

  const go = (offset: number) => {
    const nextCursor = cursor + offset;
    const nextActualCursor = store.length - 1 + nextCursor;
    if (nextActualCursor < 0 || nextActualCursor >= store.length) {
      return;
    }

    setCursor(nextCursor);
    handler(store[nextActualCursor]);
  };

  return {
    node: (
      <>
        <button disabled={!canBack} onClick={() => go(-1)}>
          <ArrowBack />
        </button>
        <button
          disabled={!canForward}
          style={{ marginLeft: 5 }}
          onClick={() => go(1)}
        >
          <ArrowForward />
        </button>
      </>
    ),
    push(data: CanvasData) {
      setStore((prev) => [...prev.slice(-historyLength), data]);
      setCursor(0);
    },
  };
}
