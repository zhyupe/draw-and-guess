import {
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
  MouseEvent,
} from 'react';

const dataRate = 100;
const inactive = -1;

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
    data?: Uint8ClampedArray;
    width: number;
    height: number;
    lineWidth: number;
    lineColor: string;
    onChange?: (data: Uint8ClampedArray) => void;
  },
  ref: ForwardedRef<{
    clear: () => void;
  }>,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>();

  /** negative: inactive; zero/positive: count of move data collected */
  const dataCollected = useRef(inactive);

  useImperativeHandle(ref, () => ({
    clear() {
      ctx.current?.clearRect(0, 0, width, height);
    },
  }));

  useEffect(() => {
    ctx.current =
      canvas.current?.getContext('2d', {
        willReadFrequently: true,
      }) ?? null;
  }, [canvas.current]);

  useEffect(() => {
    if (ctx.current) {
      ctx.current.lineWidth = lineWidth;
    }
  }, [ctx.current, lineWidth]);

  useEffect(() => {
    if (ctx.current) {
      ctx.current.strokeStyle = lineColor;
    }
  }, [ctx.current, lineColor]);

  useEffect(() => {
    if (drawing || !data || !ctx.current) return;

    const imgData = ctx.current.createImageData(width, height);
    for (let i = 0; i < data.length; ++i) {
      imgData.data[i] = data[i];
    }

    ctx.current.putImageData(imgData, 0, 0);
  }, [ctx.current, data, drawing]);

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;

      const rect = canvas.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const context = ctx.current;
      context.beginPath();
      context.arc(x, y, context.lineWidth / 2, 0, 2 * Math.PI);
      context.closePath();
      context.fillStyle = context.strokeStyle;
      context.fill();
      context.fillStyle = 'white';
    },
    [drawing],
  );

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!drawing || !canvas.current || !ctx.current) return;

      const rect = canvas.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const context = ctx.current;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(x, y);

      dataCollected.current = 1;
    },
    [drawing],
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        !drawing ||
        dataCollected.current === inactive ||
        !canvas.current ||
        !ctx.current
      )
        return;

      const rect = canvas.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const context = ctx.current;
      context.lineTo(x, y);
      context.stroke();
      context.moveTo(x, y);

      if (++dataCollected.current > dataRate) {
        dataCollected.current = 0;

        const data = context.getImageData(0, 0, width, height);
        onChange?.(data.data);
      }
    },
    [drawing],
  );

  const onMouseUp = useCallback(
    (event: MouseEvent) => {
      if (
        !drawing ||
        dataCollected.current === inactive ||
        !canvas.current ||
        !ctx.current
      )
        return;

      const rect = canvas.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const context = ctx.current;
      context.lineTo(x, y);
      context.closePath();
      context.stroke();

      dataCollected.current = inactive;

      const data = context.getImageData(0, 0, width, height);
      onChange?.(data.data);
    },
    [drawing],
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
      }}
    />
  );
}

export const Canvas = forwardRef(RealCanvas);
