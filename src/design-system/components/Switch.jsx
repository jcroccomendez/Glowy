import useSound from 'use-sound';

/**
 * Switch — pill toggle with accent colors.
 *
 * @typedef {Object} SwitchProps
 * @property {string} label
 * @property {boolean} checked
 * @property {(v:boolean)=>void} onChange
 * @property {import('react').ReactNode} [icon]
 */

/** @param {SwitchProps} props */
export const Switch = ({ label, checked, onChange, icon }) => {
  const [playClick] = useSound('/sounds/rollover6.ogg', { volume: 0.4 });
  const toggle = () => { playClick(); onChange(!checked); };
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#666]">{icon}</span>}
        <label className="text-[12px] font-medium text-white cursor-pointer" onClick={toggle}>
          {label}
        </label>
      </div>
      <button
        onClick={toggle}
        className={`relative inline-flex h-[18px] w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--slider-track)] opacity-60'
          }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] transform rounded-full transition-transform duration-200 shadow-sm ${checked ? 'translate-x-[18px] bg-[var(--accent-inverse)]' : 'translate-x-0.5 bg-[#666]'
            }`}
        />
      </button>
    </div>
  );
};
