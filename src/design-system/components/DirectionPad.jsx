import useSound from 'use-sound';

/**
 * DirectionPad — 4-pill directional selector inside a rounded box.
 *
 * @typedef {'top'|'bottom'|'left'|'right'} Dir
 * @typedef {Object} DirectionPadProps
 * @property {string} label
 * @property {Dir} direction
 * @property {(d:Dir)=>void} onChange
 * @property {Dir[]} [disabledDirs]
 */

/** @param {DirectionPadProps} props */
export const DirectionPad = ({ label, direction, onChange, disabledDirs = [] }) => {
  const [playClick] = useSound('/sounds/rollover6.ogg', { volume: 0.4 });
  const handle = (dir) => { if (!disabledDirs.includes(dir)) { playClick(); onChange(dir); } };

  const getPillClass = (dir) => {
    const isDisabled = disabledDirs.includes(dir);
    const isActive = direction === dir;
    const base = `absolute transition-colors duration-200 ${isDisabled ? 'opacity-10 cursor-not-allowed' : 'cursor-pointer'}`;
    const activeColor = 'bg-[var(--accent)]';
    const inactiveColor = 'bg-[var(--accent)] opacity-25 hover:opacity-40';
    let shape = '';
    if (dir === 'top') shape = 'w-1.5 h-4 top-1.5 left-1/2 -translate-x-1/2 rounded-full';
    if (dir === 'bottom') shape = 'w-1.5 h-4 bottom-1.5 left-1/2 -translate-x-1/2 rounded-full';
    if (dir === 'left') shape = 'w-4 h-1.5 left-1.5 top-1/2 -translate-y-1/2 rounded-full';
    if (dir === 'right') shape = 'w-4 h-1.5 right-1.5 top-1/2 -translate-y-1/2 rounded-full';
    return `${base} ${shape} ${isActive ? activeColor : inactiveColor}`;
  };

  return (
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative w-24 h-14 bg-[var(--tab-active)] rounded-xl flex items-center justify-center">
        <div className="relative w-4 h-4 pointer-events-none opacity-30">
          <div className="absolute top-1/2 left-0 w-full h-px bg-[#666] -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-px h-full bg-[#666] -translate-x-1/2" />
        </div>
        <div onClick={() => handle('top')} className={getPillClass('top')} />
        <div onClick={() => handle('bottom')} className={getPillClass('bottom')} />
        <div onClick={() => handle('left')} className={getPillClass('left')} />
        <div onClick={() => handle('right')} className={getPillClass('right')} />
      </div>
    </div>
  );
};
