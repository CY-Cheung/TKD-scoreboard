import './Card.css'
import { useRef, useEffect } from "react";

function Card({ color, height, children }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    function handleMouseMove(e) {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--x', `${x}%`);
      card.style.setProperty('--y', `${y}%`);
    }

    card.addEventListener('mousemove', handleMouseMove);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      className="card"
      ref={cardRef}
      style={{
        "--card-color": color,
        "--card-height": height,
      }}
    >
      {children}
    </div>
  );
}

export default Card;