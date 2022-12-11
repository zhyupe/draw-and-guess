import {
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
  MouseEvent,
  TouchEvent,
} from 'react';

const parseEvent = (canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent) => {
  const rect = canvas.getBoundingClientRect();
  const ratioX = canvas.width / rect.width;
  const ratioY = canvas.height / rect.height;

  if ('touches' in e) {
    const t = e.touches[0];
    if (!t) return null;

    const x = (t.clientX - rect.left) * ratioX;
    const y = (t.clientY - rect.top) * ratioY;

    return { x, y, force: (t as any).force || 1 };
  } else {
    const x = (e.clientX - rect.left) * ratioX;
    const y = (e.clientY - rect.top) * ratioY;

    return { x, y, force: 1 };
  }
};

export interface CanvasRefObject {
  set: (data: CanvasData) => void;
  clear: () => void;
}

export type CanvasData = ArrayBuffer;
export type CanvasOnChange = (data: CanvasData, shouldSave?: boolean) => void;

const getData = (canvas: HTMLCanvasElement) =>
  new Promise<CanvasData>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error('blob is null'));
      }

      blob.arrayBuffer().then(resolve).catch(reject);
    }, 'png');
  });

const doCommit = (() => {
  let updated = false;

  let running = false;
  let latestShouldSave = false;
  let latestCallback: CanvasOnChange;

  return async (
    canvas: HTMLCanvasElement,
    callback: CanvasOnChange,
    shouldSave: boolean,
  ) => {
    latestCallback = callback;
    latestShouldSave ||= shouldSave;

    updated = true;
    console.log('[commitWorker] updated');

    if (running) {
      return;
    }

    running = true;
    console.log('[commitWorker] run');
    while (updated) {
      const currentShouldSave = latestShouldSave;
      latestShouldSave = false;
      updated = false;

      console.log('[commitWorker] start');
      const start = Date.now();
      const data = await getData(canvas);

      latestCallback(data, currentShouldSave);
      console.log(`[commitWorker] finished in ${Date.now() - start}ms`);
    }

    running = false;
    console.log('[commitWorker] stop');
  };
})();

function RealCanvas(
  {
    drawing,
    width,
    height,
    lineWidth,
    lineColor,
    onChange,
  }: {
    drawing: boolean;
    width: number;
    height: number;
    lineWidth: number;
    lineColor: string;
    onChange?: CanvasOnChange;
  },
  ref: ForwardedRef<CanvasRefObject>,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>();

  const commit = useCallback(
    (shouldSave?: boolean) => {
      if (!canvas.current || !onChange) return;
      doCommit(canvas.current, onChange, !!shouldSave);
    },
    [onChange],
  );

  /** null: inactive */
  const dataChanged = useRef<boolean | null>(null);

  useImperativeHandle(ref, () => ({
    set(data) {
      if (!data || !ctx.current) return;

      const image = new Image();
      image.src = URL.createObjectURL(
        new Blob([data], {
          type: 'image/png',
        }),
      );

      image.onload = () => {
        if (!ctx.current) return;
        ctx.current.clearRect(0, 0, width, height);
        ctx.current.drawImage(image, 0, 0);
      };
    },
    clear() {
      if (!drawing || !ctx.current) return;

      ctx.current.clearRect(0, 0, width, height);
      commit(true);
    },
  }));

  useEffect(() => {
    let timer: number | null = null;
    const listen = () => {
      timer = requestAnimationFrame(() => {
        if (dataChanged.current) {
          dataChanged.current = false;
          commit();
        }

        listen();
      });
    };

    listen();
    return () => {
      if (timer !== null) {
        cancelAnimationFrame(timer);
      }
    };
  }, [drawing, commit]);

  useEffect(() => {
    ctx.current = canvas.current?.getContext('2d') ?? null;
  }, [canvas.current]);

  useEffect(() => {
    if (ctx.current) {
      ctx.current.strokeStyle = lineColor;
    }
  }, [ctx.current, lineColor]);

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;

      const move = parseEvent(canvas.current, event);
      if (move) {
        const { x, y, force } = move;

        const context = ctx.current;
        context.beginPath();
        context.arc(x, y, (lineWidth * force) / 2, 0, 2 * Math.PI);
        context.closePath();
        context.fillStyle = context.strokeStyle;
        context.fill();
        context.fillStyle = 'white';

        commit(true);
      }
    },
    [drawing, lineWidth],
  );

  const lastMove = useRef<ReturnType<typeof parseEvent>>(null);
  const onMouseDown = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;

      const move = parseEvent(canvas.current, event);
      lastMove.current = move;

      if (move) {
        const { x, y, force } = move;
        const context = ctx.current;
        context.lineWidth = lineWidth * force;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(x, y);

        dataChanged.current = true;
      } else {
        dataChanged.current = false;
      }
    },
    [drawing, lineWidth],
  );

  const onMouseMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (
        !drawing ||
        dataChanged.current === null ||
        !canvas.current ||
        !ctx.current
      )
        return;

      const move = parseEvent(canvas.current, event);
      const moved =
        move &&
        lastMove.current &&
        (move.x !== lastMove.current.x || move.y !== lastMove.current.y);

      if (moved) {
        lastMove.current = move;
        console.log(move);

        const { x, y, force } = move;
        const context = ctx.current;
        context.lineWidth = lineWidth * force;
        context.lineTo(x, y);
        context.stroke();
        context.closePath();
        context.beginPath();
        context.moveTo(x, y);

        dataChanged.current = true;
      }
    },
    [drawing, lineWidth],
  );

  const onMouseUp = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (
        !drawing ||
        dataChanged.current === null ||
        !canvas.current ||
        !ctx.current
      )
        return;

      const move = parseEvent(canvas.current, event);
      if (move) {
        const { x, y, force } = move;
        const context = ctx.current;
        context.lineWidth = lineWidth * force;
        context.lineTo(x, y);
        context.closePath();
        context.stroke();
      }

      dataChanged.current = null;
      commit();
    },
    [drawing, lineWidth],
  );

  return (
    <canvas
      ref={canvas}
      style={{
        display: 'block',
        touchAction: 'none',
      }}
      {...{
        width,
        height,
        onClick,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseOut: onMouseUp,
        onTouchStartCapture: onMouseDown,
        onTouchMoveCapture: onMouseMove,
        onTouchEndCapture: onMouseUp,
        onTouchCancelCapture: onMouseUp,
      }}
    />
  );
}

export const Canvas = forwardRef(RealCanvas);
