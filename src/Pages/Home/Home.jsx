import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';

import './Home.css';
import Button from '../../Components/Button/Button';
import QRCodeDisplay from '../../Components/QRCodeDisplay/QRCodeDisplay';

// 引入 Bootstrap Icons
import { Display, Controller, Diagram2, PersonBadge, BoxArrowRight, ArrowLeftRight } from 'react-bootstrap-icons';

function Home() {
    const navigate = useNavigate();
    const { session, user, googleLogout, logout } = useAuth();
    const [eventName, setEventName] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

    useEffect(() => {
        if (!session?.eventId) {
            setEventName('');
            return;
        }

        // Fetch Event Name from Database
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

    const handleSessionLogout = () => {
        logout();
        navigate('/court-setup');
    };

    // Google Sign Out & Clear Session with Redirect to Court Setup
    const handleGoogleLogout = async () => {
        try {
            await googleLogout();
        } catch (err) {
            console.error("Google logout error:", err);
        } finally {
            logout();
            navigate('/court-setup');
        }
    };

    return (
        <div className="home aurora-bg">

            {/* --- Top Right User Profile Info Card --- */}
            {user && (
                <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50, backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="User Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6c5ce7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                                {user.displayName?.[0] || 'U'}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.2' }}>{user.displayName || 'User'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', lineHeight: '1.2' }}>{user.email}</div>
                        </div>
                    </div>
                    <Button 
                        onClick={handleGoogleLogout}
                        title="Sign Out of Google Account & Redirect to Court Setup"
                        fontSize="0.85rem"
                        variant="orange"
                        icon={<BoxArrowRight size={14} />}
                        text="Log Out"
                        style={{ padding: '6px 12px', minWidth: 'auto', margin: 0 }}
                    />
                </div>
            )}

            {/* --- Bottom Right Session Info Card --- */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 50, backgroundColor: 'rgba(20, 20, 25, 0.78)', padding: '15px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '250px', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Event Name</span>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{session?.eventName || eventName || session?.eventId || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Event ID</span>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{session?.eventId || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Court ID</span>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{session?.courtId || 'N/A'}</span>
                </div>
                <Button
                    text="Change Court Session"
                    onClick={handleSessionLogout}
                    fontSize="0.85rem"
                    angle={0}
                    icon={<ArrowLeftRight size={14} />}
                    style={{ marginTop: '5px' }}
                />
            </div>

            {/* --- 中間 2x2 網格佈局 (帶有對應 Button 顏色的發光 Glow 特效) --- */}
            <div className="home-grid">
                {/* Screen Card */}
                <div className="home-card screen-card" onClick={() => navigate("/screen")}>
                    <Display className="home-card-icon" />
                    <Button text="Screen" fontSize="2.2dvh" angle={50} readOnly />
                </div>

                {/* Controller Card */}
                <div className="home-card controller-card" onClick={() => navigate("/controller")}>
                    <Controller className="home-card-icon" />
                    <Button text="Controller" fontSize="2.2dvh" angle={270} readOnly />
                </div>

                {/* Data Import Card */}
                <div className="home-card import-card" onClick={() => navigate("/import")}>
                    <Diagram2 className="home-card-icon" />
                    <Button text="Data Import" fontSize="2.2dvh" angle={90} readOnly />
                </div>

                {/* Referee Register Card */}
                <div className="home-card referee-card" onClick={() => setShowQRCode(true)}>
                    <PersonBadge className="home-card-icon" />
                    <Button text="Referee Register" fontSize="2.2dvh" angle={180} readOnly />
                </div>
            </div>

            {/* QR Code Overlay Modal */}
            <QRCodeDisplay
                eventId={session?.eventId}
                eventName={eventName}
                courtId={session?.courtId}
                visible={showQRCode}
                onClose={() => setShowQRCode(false)}
            />
        </div>
    );
}

export default Home;
