import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export default {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)}>
          <h2 className="text-[20px] mb-2">Your file is ready!</h2>
          <p className="text-[13px] opacity-70">Backdrop blur, fade + scale in/out.</p>
        </Modal>
      </>
    );
  },
};
