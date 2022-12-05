import { useState } from 'react';
import './App.css';
import { Canvas } from './components/canvas';
import { PopoverPicker } from './components/colorpicker';
import { SizePicker } from './components/sizepicker';

function App() {
  const [color, setColor] = useState('#000');
  const [size, setSize] = useState(2);

  return (
    <div className="App">
      <main>
        <div className="drawing-canvas">
          <Canvas
            width={1280}
            height={720}
            lineWidth={size}
            lineColor={color}
            drawing
          />
        </div>
        <div className="drawing-tool">
          <PopoverPicker color={color} onChange={setColor} />
          <span className="pipe" />
          <SizePicker color={color} value={size} onChange={setSize} />
        </div>
      </main>
    </div>
  );
}

export default App;
