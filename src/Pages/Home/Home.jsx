import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

import './Home.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';

function Home() {
	const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/court-setup'); // Redirect to login page after logout
    };

	return (
		<div
			className="home"
			// onClick={() => document.documentElement.requestFullscreen()} // Optional: can be re-enabled if needed
		>
			<Squares
				speed={0.5}
				squareSize={100}
				direction="diagonal"
				borderColor="hsla(270, 50%, 50%, 0.25)"
				hoverFillColor="hsla(60, 50%, 50%, 0.25)"
			/>

            <div className="session-info-form">
                <div className="form-group">
                    <label>Event ID</label>
                    <div className="form-value">{user?.eventId || 'N/A'}</div>
                </div>
                <div className="form-group">
                    <label>Court ID</label>
                    <div className="form-value">{user?.courtId || 'N/A'}</div>
                </div>
                <Button
                    text="Logout"
                    onClick={handleLogout}
                    fontSize="1.5dvw"
                    angle={0}
                />
            </div>

			<div className="menu">
				<Button
					text="Screen"
					fontSize="3dvw"
					angle={0}
					onClick={() => navigate("/screen")}
				/>
				<Button
					text="Controller"
					fontSize="3dvw"
					angle={60}
					onClick={() => navigate("/controller")}
				/>
                <Button
					text="Data Import"
					fontSize="3dvw"
					angle={180}
					onClick={() => navigate("/import")}
				/>
                <Button
					text="Referee Register"
					fontSize="3dvw"
					angle={300}
					onClick={() => navigate("/referee/register")}
				/>
			</div>
		</div>
	);
}

export default Home;
