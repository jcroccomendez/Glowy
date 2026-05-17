import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

export default {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
};

export const TextItems = {
  render: () => {
    const [v, setV] = useState('1:1');
    return (
      <SegmentedControl
        ariaLabel="Format"
        value={v}
        onChange={setV}
        items={[
          { key: '9:16', label: '9:16' },
          { key: '1:1', label: '1:1' },
          { key: '16:9', label: '16:9' },
        ]}
      />
    );
  },
};
