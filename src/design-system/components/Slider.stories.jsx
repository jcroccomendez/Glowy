import { useState } from 'react';
import { Slider } from './Slider';

export default {
  title: 'Components/Slider',
  component: Slider,
  tags: ['autodocs'],
};

export const Default = {
  args: { label: 'Thickness', min: 0.5, max: 5, step: 0.1 },
  render: (args) => {
    const [v, setV] = useState(1.8);
    return <div style={{ width: 240 }}><Slider {...args} value={v} onChange={setV} formatValue={(x) => `${x.toFixed(1)}px`} /></div>;
  },
};
