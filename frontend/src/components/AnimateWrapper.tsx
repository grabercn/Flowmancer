import React, { useEffect, useState, useRef, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimateWrapperProps {
  show: boolean;
  children: ReactElement<any, any>;
  duration?: number;
  containerClassName?: string;
  childClassName?: string;
  animation?: 'slide-up' | 'slide-left' | 'fade' | 'zoom';
}

const ANIM_PREFIX = 'animate-wrapper';

export function AnimateWrapper({
  show,
  children,
  duration = 300,
  containerClassName = '',
  childClassName = '',
  animation = 'slide-up',
}: AnimateWrapperProps) {
  const [visible, setVisible] = useState(show);
  const [stage, setStage] = useState<'enter' | 'enter-active' | 'exit' | 'exit-active'>(
    show ? 'enter-active' : 'exit-active'
  );

  const enterTimer = useRef<number>(0);
  const exitTimer = useRef<number>(0);
  const prevShow = useRef(show);

  // Transition spec
  const transition = { duration: duration / 1000, ease: 'easeInOut' };

  // Animation variants
  const variants: Record<string, any> = {
    'slide-up': {
      hidden: { opacity: 0, y: -10, transition },
      visible: { opacity: 1, y: 0, transition },
      exit: { opacity: 0, y: -10, transition },
    },
    'slide-left': {
      hidden: { opacity: 0, x: -20, transition },
      visible: { opacity: 1, x: 0, transition },
      exit: { opacity: 0, x: -20, transition },
    },
    fade: {
      hidden: { opacity: 0, transition },
      visible: { opacity: 1, transition },
      exit: { opacity: 0, transition },
    },
    zoom: {
      hidden: { opacity: 0, scale: 0.95, transition },
      visible: { opacity: 1, scale: 1, transition },
      exit: { opacity: 0, scale: 0.95, transition },
    },
  };

  // Keep your mount/unmount timing
  useEffect(() => {
    clearTimeout(enterTimer.current);
    clearTimeout(exitTimer.current);

    if (show) {
      if (!prevShow.current) {
        // wait for any exit animation to finish
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
      setStage('exit');
      enterTimer.current = window.setTimeout(() => setStage('exit-active'), 10);
      exitTimer.current = window.setTimeout(() => setVisible(false), duration);
    }

    prevShow.current = show;
    return () => {
      clearTimeout(enterTimer.current);
      clearTimeout(exitTimer.current);
    };
  }, [show, duration]);

  if (!visible) return null;

  // Build your CSS classes
  const containerClasses = [ANIM_PREFIX, stage, containerClassName].filter(Boolean).join(' ');

  // Clone child to append any extra className
  const child = React.cloneElement(children, {
    className: [children.props.className || '', childClassName].filter(Boolean).join(' '),
  });

  // Detect child’s natural display (fallback to block)
  const childDisplay = children.props.style?.display || 'block';

  return (
    <AnimatePresence>
      <motion.div
        // your old classes for CSS hooks
        className={containerClasses}
        // allow natural layout (block/inline) inherited from child
        style={{ display: childDisplay }}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants[animation]}
      >
        {child}
      </motion.div>
    </AnimatePresence>
  );
}
