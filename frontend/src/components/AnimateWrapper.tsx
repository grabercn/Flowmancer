import React, { useEffect, useState, useRef, type ReactElement } from 'react';

interface AnimateWrapperProps {
  show: boolean;
  children: ReactElement<any, any>;
  duration?: number;
  containerClassName?: string;
  childClassName?: string;
}

const ANIM_PREFIX = 'animate-wrapper';

export function AnimateWrapper({
  show,
  children,
  duration = 300,
  containerClassName = '',
  childClassName = '',
}: AnimateWrapperProps) {
  const [visible, setVisible] = useState(show);
  const [stage, setStage] = useState<'enter' | 'enter-active' | 'exit' | 'exit-active'>(
    show ? 'enter-active' : 'exit-active'
  );

  const enterTimer = useRef<number>(0);
  const exitTimer = useRef<number>(0);
  const prevShow = useRef(show);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById('animate-wrapper-styles')) return;
    const style = document.createElement('style');
    style.id = 'animate-wrapper-styles';
    style.textContent = `
      .${ANIM_PREFIX} {
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity ${duration}ms ease, transform ${duration}ms ease;
      }
      .${ANIM_PREFIX}.enter-active {
        opacity: 1;
        transform: translateY(0);
      }
      .${ANIM_PREFIX}.exit-active {
        opacity: 0;
        transform: translateY(-10px);
      }
    `;
    document.head.appendChild(style);
  }, [duration]);

  // Watch `show` changes to trigger stages with delay on entry
  useEffect(() => {
    // Clear any pending timers
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(exitTimer.current);

    if (show) {
      if (!prevShow.current) {
        // Delay mounting until previous exit completes
        exitTimer.current = window.setTimeout(() => {
          setVisible(true);
          setStage('enter');
          enterTimer.current = window.setTimeout(() => setStage('enter-active'), 10);
        }, duration);
      } else {
        setVisible(true);
        setStage('enter');
        enterTimer.current = window.setTimeout(() => setStage('enter-active'), 10);
      }
    } else {
      // Start exit animation immediately
      setStage('exit');
      enterTimer.current = window.setTimeout(() => setStage('exit-active'), 10);
      // After duration, unmount
      exitTimer.current = window.setTimeout(() => setVisible(false), duration);
    }

    prevShow.current = show;
    return () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(exitTimer.current);
    };
  }, [show, duration]);

  if (!visible) return null;

  const containerClasses = [ANIM_PREFIX, stage, containerClassName]
    .filter(Boolean)
    .join(' ');

  const child = React.cloneElement(children, {
    className: [children.props.className || '', childClassName].filter(Boolean).join(' '),
  });

  return <div className={containerClasses}>{child}</div>;
}
