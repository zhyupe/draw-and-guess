import style from './index.module.css';

function Dot({
  color = '#000',
  size,
  active,
  onClick,
}: {
  color?: string;
  size: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={style.dot}
      style={{ borderColor: active ? color : 'transparent' }}
    >
      <span style={{ width: size, height: size, background: color }} />
    </div>
  );
}

const values = [2, 4, 6, 12, 24];
export function SizePicker({
  color,
  value,
  onChange,
}: {
  color?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={style.wrap}>
      {values.map((item) => (
        <Dot
          key={`${item}`}
          color={color}
          size={item}
          active={item === value}
          onClick={() => onChange(item)}
        />
      ))}
    </div>
  );
}
