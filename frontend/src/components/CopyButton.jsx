import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/utils.js';

export default function CopyButton({ text, label = 'Copy', className = 'btn btn-ghost btn-sm' }) {
  const [state, setState] = useState('idle');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? 'done' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };
  return (
    <button type="button" className={className} onClick={onClick}>
      {state === 'done' ? 'Copied' : state === 'failed' ? 'Press Ctrl+C' : label}
    </button>
  );
}
