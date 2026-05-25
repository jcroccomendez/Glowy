import { useRef, useState, useLayoutEffect } from 'react';
import useSound from 'use-sound';

/**
 * Slider — pill-style range with inline label + value, fill track, ticks, vertical-bar thumb.
 * Thumb auto-dims when its position crosses behind label/value text to avoid visual clash.
 *
 * @typedef {Object} SliderProps
 * @property {string} label
 * @property {number} value
 * @property {number} min
 * @property {number} max
 * @property {number} [step]
 * @property {(v:number)=>void} onChange
 * @property {(v:number)=>any} [formatValue]
 * @property {number} [ticks] - number of interior tick marks (default 11)
 */

/** @param {SliderProps} props */
export const Slider = ({ label, value, min, max, step, onChange, formatValue = (v) => v, ticks = 11 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const [playTick] = useSound('/sounds/rollover6.ogg', { volume: 0.25 });
  const lastPlayRef = useRef(0);
  const containerRef = useRef(null);
  const labelRef = useRef(null);
  const valueRef = useRef(null);
  const [overText, setOverText] = useState(false);

  useLayoutEffect(() => {
    const c = containerRef.current, l = labelRef.current, v = valueRef.current;
    if (!c || !l || !v) return;
    const cw = c.clientWidth;
    if (cw <= 0) return;
    const thumbX = 6 + (cw - 12) * (percentage / 100);
    const pad = 6;
    const labelEnd = l.offsetLeft + l.offsetWidth + pad;
    const valueStart = v.offsetLeft - pad;
    setOverText(thumbX <= labelEnd || thumbX >= valueStart);
  }, [percentage, label, value]);

  return (
    <div className="glowy-slider mb-3 last:mb-0" ref={containerRef} data-thumb-over-text={overText || undefined}>
      <div className="glowy-slider__fill" style={{ width: `${percentage}%` }} />
      <div className="glowy-slider__ticks" aria-hidden="true">
        {Array.from({ length: ticks }).map((_, i) => (
          <span key={i} className="glowy-slider__tick" />
        ))}
      </div>
      <div className="glowy-slider__row">
        <span className="glowy-slider__label" ref={labelRef}>{label}</span>
        <span className="glowy-slider__value" ref={valueRef}>{formatValue(value)}</span>
      </div>
      <span className="glowy-slider__thumb" style={{ left: `calc(6px + (100% - 12px) * ${percentage / 100})` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
          const now = performance.now();
          if (now - lastPlayRef.current > 40) {
            lastPlayRef.current = now;
            playTick();
          }
        }}
        className="glowy-slider__input"
      />
    </div>
  );
};
