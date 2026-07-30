import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';

import './Home.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';
import QRCodeDisplay from '../../Components/QRCodeDisplay/QRCodeDisplay';

// 引入 Bootstrap Icons
import { Display, Controller, Diagram2, PersonBadge } from 'react-bootstrap-icons';

function Home() {
    const navigate = useNavigate();
    const { session, logout } = useAuth();
    const [eventName, setEventName] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

    useEffect(() => {
        if (!session?.eventId) {
            setEventName('');
            return;
        }

        // Fetch Event Name from Database (checks EventName, eventName, settings/eventName, or name)
        const eventRef = ref(database, `events/${session.eventId}`);
        get(eventRef).then((snapshot) => {
            if (snapshot.exists()) {
                const val = snapshot.val();
                const fetchedName = val?.EventName || val?.eventName || val?.settings?.eventName || val?.name || session.eventId;
                setEventName(fetchedName);
            } else {
                setEventName(session.eventId);
            }
        }).catch(() => {
            setEventName(session.eventId);
        });
    }, [session?.eventId]);

    // Shortcut key 'Q' to toggle QR code modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'q' || e.key === 'Q') {
                setShowQRCode((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
                    <label>Event Name</label>
                    <div className="form-value">{session?.eventName || eventName || session?.eventId || 'N/A'}</div>
                </div>
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

                {/* Referee Register Card - Now opens Referee Controller QR Code modal directly */}
                <div className="home-card" onClick={() => setShowQRCode(true)}>
                    <PersonBadge className="home-card-icon" />
                    <Button text="Referee Register" fontSize="2.5dvh" angle={180} readOnly />
                </div>
            </div>

            {/* QR Code Overlay Modal */}
            <QRCodeDisplay
                eventId={session?.eventId}
                courtId={session?.courtId}
                visible={showQRCode}
                onClose={() => setShowQRCode(false)}
            />
        </div>
    );
}

export default Home;
