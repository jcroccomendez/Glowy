import { useRef } from 'react';
import useSound from 'use-sound';

/**
 * Slider — labeled range with custom track + tick sound.
 *
 * @typedef {Object} SliderProps
 * @property {string} label
 * @property {number} value
 * @property {number} min
 * @property {number} max
 * @property {number} [step]
 * @property {(v:number)=>void} onChange
 * @property {(v:number)=>any} [formatValue]
 */

/** @param {SliderProps} props */
export const Slider = ({ label, value, min, max, step, onChange, formatValue = (v) => v }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const [playTick] = useSound('/sounds/rollover6.ogg', { volume: 0.25 });
  const lastPlayRef = useRef(0);
  return (
    <div className="flex flex-col gap-1 mb-1 last:mb-0">
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <label className="text-[11px] font-medium text-white">{label}</label>
        <span className="text-[11px] text-[#666] font-mono tabular-nums">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
          const now = performance.now();
          if (now - lastPlayRef.current > 40) {
            lastPlayRef.current = now;
            playTick();
          }
        }}
        className="w-full h-[2px] rounded-full appearance-none cursor-pointer focus:outline-none"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--slider-track) ${percentage}%, var(--slider-track) 100%)`,
        }}
      />
    </div>
  );
};
