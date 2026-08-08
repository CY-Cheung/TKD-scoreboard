import React, { useRef, useState, useLayoutEffect } from 'react';
import './MarqueeText.css';

const MarqueeText = ({ text, style, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (containerRef.current && textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`marquee-container ${className || ''}`} style={{ justifyContent: isOverflowing ? 'flex-start' : 'center', ...style }}>
      <div
        ref={textRef}
        className={`marquee-content ${isOverflowing ? 'overflowing' : ''}`}
      >
        {text}
      </div>
    </div>
  );
};

export default MarqueeText;
