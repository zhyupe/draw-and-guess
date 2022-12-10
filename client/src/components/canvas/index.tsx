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
  if ('touches' in e) {
    const t = e.touches[0];
    if (!t) return null;

    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;

    return { x, y, force: (t as any).force || 1 };
  } else {
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y, force: 1 };
  }
};

export interface CanvasRefObject {
  clear: () => void;
}

function RealCanvas(
  {
    drawing,
    data,
    width,
    height,
    lineWidth,
    lineColor,
    onChange,
  }: {
    drawing: boolean;
    data?: string;
    width: number;
    height: number;
    lineWidth: number;
    lineColor: string;
    onChange?: (data: string, shouldSave?: boolean) => void;
  },
  ref: ForwardedRef<CanvasRefObject>,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>();

  const commit = useCallback(
    (shouldSave?: boolean) => {
      if (!canvas.current || !onChange) return;

      const data = canvas.current.toDataURL('png');
      onChange(data, shouldSave);
    },
    [onChange],
  );

  /** null: inactive */
  const dataChanged = useRef<boolean | null>(null);

  useImperativeHandle(ref, () => ({
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
    ctx.current =
      canvas.current?.getContext('2d', {
        willReadFrequently: true,
      }) ?? null;
  }, [canvas.current]);

  useEffect(() => {
    if (ctx.current) {
      ctx.current.strokeStyle = lineColor;
    }
  }, [ctx.current, lineColor]);

  useEffect(() => {
    if (drawing || !data || !ctx.current) return;

    const image = new Image();
    image.src = data;

    image.onload = () => {
      ctx.current?.clearRect(0, 0, width, height);
      ctx.current?.drawImage(image, 0, 0);
    };
  }, [ctx.current, data, drawing, width, height]);

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;
      event.preventDefault();

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

  const onMouseDown = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;
      event.preventDefault();

      const move = parseEvent(canvas.current, event);
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
      event.preventDefault();

      const move = parseEvent(canvas.current, event);
      if (move) {
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
      event.preventDefault();

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
