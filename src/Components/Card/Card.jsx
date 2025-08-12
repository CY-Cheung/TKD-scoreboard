import './Card.css'

function Card({ color1, color2, height, width, children }) {
  const c1 = color1 || "#fff";
  const c2 = color2 || color1 || "#fff";

  return (
    <div
      className="card"
      style={{
        "--card-color-1": c1,
        "--card-color-2": c2,
        "--card-height": height,
        "--card-width": width,
      }}
    >
      {children}
    </div>
  );
}

export default Card;