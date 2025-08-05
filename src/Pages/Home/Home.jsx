import Button from '../../Components/Button/Button'
import './Home.css'

function Home() {
  const angles = Array.from({ length: 36 }, (_, i) => i * 10); // 0~350, step 10

  return (
    <div className="home">
      <Button text="Click Me" fontSize="3rem" angle={200} />
    </div>
  );
}

export default Home;
