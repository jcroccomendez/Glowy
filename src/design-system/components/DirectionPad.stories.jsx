import { useState } from 'react';
import { DirectionPad } from './DirectionPad';

export default {
  title: 'Components/DirectionPad',
  component: DirectionPad,
  tags: ['autodocs'],
};

export const Default = {
  args: { label: 'Dot Direction' },
  render: (args) => {
    const [dir, setDir] = useState('left');
    return <div style={{ width: 280 }}><DirectionPad {...args} direction={dir} onChange={setDir} /></div>;
  },
};

export const WithDisabled = {
  args: { label: 'Dot Direction', disabledDirs: ['top', 'bottom'] },
  render: Default.render,
};
