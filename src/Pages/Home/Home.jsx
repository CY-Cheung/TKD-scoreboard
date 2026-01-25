import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

import './Home.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';

// 引入 Bootstrap Icons
import { Display, Controller, Diagram2, PersonBadge } from 'react-bootstrap-icons';

function Home() {
	const navigate = useNavigate();
    const { session, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/court-setup');
    };

	return (
		<div className="home">
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
                    <div className="form-value">{session?.eventId || 'N/A'}</div>
                </div>
                <div className="form-group">
                    <label>Court ID</label>
                    <div className="form-value">{session?.courtId || 'N/A'}</div>
                </div>
                <Button
                    text="Logout"
                    onClick={handleLogout}
                    fontSize="1.6dvh"
                    angle={0}
                />
            </div>

            {/* --- 2x2 網格佈局 --- */}
			<div className="home-grid">
                {/* Screen Card */}
                <div className="home-card" onClick={() => navigate("/screen")}>
                    <Display className="home-card-icon" />
                    <Button text="Screen" fontSize="2.5dvh" angle={50} readOnly />
                </div>

                {/* Controller Card */}
                <div className="home-card" onClick={() => navigate("/controller")}>
                    <Controller className="home-card-icon" />
                    <Button text="Controller" fontSize="2.5dvh" angle={270} readOnly />
                </div>

                {/* Data Import Card */}
                <div className="home-card" onClick={() => navigate("/import")}>
                    <Diagram2 className="home-card-icon" />
                    <Button text="Data Import" fontSize="2.5dvh" angle={90} readOnly />
                </div>

                {/* Referee Register Card */}
                <div className="home-card" onClick={() => navigate("/referee/register")}>
                    <PersonBadge className="home-card-icon" />
                    <Button text="Referee Register" fontSize="2.5dvh" angle={180} readOnly />
                </div>
			</div>
		</div>
	);
}

export default Home;
