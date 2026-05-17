import { useState } from 'react';
import { Switch } from './Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
};

export const Default = {
  args: { label: 'Dashed Lines' },
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return <div style={{ width: 240 }}><Switch {...args} checked={checked} onChange={setChecked} /></div>;
  },
};
