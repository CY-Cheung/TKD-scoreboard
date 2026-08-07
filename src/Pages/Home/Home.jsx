import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';

import './Home.css';
import Button from '../../Components/Button/Button';
import QRCodeDisplay from '../../Components/QRCodeDisplay/QRCodeDisplay';

// 引入 Bootstrap Icons
import { Display, Controller, Diagram2, PersonBadge, BoxArrowRight, ArrowLeftRight, Github } from 'react-bootstrap-icons';

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

            <div className="home-content glass-card split-layout">
                <div className="home-left-panel">
                    <div className="home-title-container">
                        <h1 style={{fontSize: '3.5vw', lineHeight: '1.1'}}>Taekwondo<br/>Scoreboard</h1>
                        <div style={{fontSize: '1.5vw', color: '#fbc531', margin: '0.3vw 0 0 0', fontWeight: '700', letterSpacing: '0.3vw', textTransform: 'uppercase'}}>Kyorugi</div>
                        <h2 style={{fontSize: '1.5vw', color: 'rgba(255,255,255,0.9)', margin: '0.8vw 0 0 0', fontWeight: 'normal', letterSpacing: '0.1vw'}}>跆拳道搏擊比賽計分系統</h2>
                        <ul className="home-app-intro-list">
                            <li>全網頁端運行，無須安裝 App。</li>
                            <li>支援手機掃描 QR Code 即時化身裁判遙控器。</li>
                            <li>具備智能席位鎖定與分數防撞機制。</li>
                            <li>支援一鍵匯入官方 PDF 賽程表，輕鬆實現多場地同步計分與賽事管理。</li>
                        </ul>
                    </div>
                    <div className="home-footer-links">
                        <a href="https://github.com/CY-Cheung/TKD-scoreboard" target="_blank" rel="noopener noreferrer">
                            <Github size={16} /> GitHub Repository
                        </a>
                    </div>
                </div>

                <div className="home-divider"></div>

                <div className="home-right-panel">
                    <div style={{ width: '100%', textAlign: 'left', marginBottom: '1.5vw' }}>
                        {(() => {
                            const fullEventName = session?.eventName || eventName || session?.eventId || 'N/A';
                            let mainEventName = fullEventName;
                            let eventDateStr = '';
                            
                            // 嘗試解析帶有多個括號嘅複雜字串，例如 "Event Name (Day 1) (2023/10/10)"
                            const matchDouble = fullEventName.match(/^(.*?)\s*\((Day[^)]+)\)\s*\(([^)]+)\)\s*$/i);
                            if (matchDouble) {
                                mainEventName = matchDouble[1].trim();
                                eventDateStr = `${matchDouble[2].trim()} - ${matchDouble[3].trim()}`;
                            } else {
                                // Fallback 解析 "Event Name (Day 1 - 2023/10/10)" 或者其他單一括號結尾嘅情況
                                const matchSingle = fullEventName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                                if (matchSingle) {
                                    mainEventName = matchSingle[1].trim();
                                    eventDateStr = matchSingle[2].trim();
                                }
                            }
                            
                            return (
                                <>
                                    <h3 style={{ fontSize: '1.6vw', color: 'white', margin: '0 0 0.5vw 0', fontWeight: 'bold', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {mainEventName}
                                    </h3>
                                    {eventDateStr && (
                                        <div style={{ fontSize: '1.6vw', color: '#fff', marginBottom: '0.5vw' }}>
                                            {eventDateStr}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                        <div style={{ fontSize: '1.6vw', color: 'rgba(255,255,255,0.9)', marginTop: '0.5vw' }}>
                            Court: <strong style={{ color: '#fff' }}>{session?.courtId || 'N/A'}</strong>
                        </div>
                    </div>

                    <div className="home-nav-container">
                        <Button onClick={handleSessionLogout} text="Change Court Session" icon={<ArrowLeftRight size={24} />} fontSize="1.35vw" angle={0} style={{ padding: '0.8vw 1.5vw', width: '100%' }} />
                        <Button onClick={() => navigate("/screen")} text="Screen" icon={<Display size={24} />} fontSize="1.35vw" angle={50} style={{ padding: '0.8vw 1.5vw', width: '100%' }} />
                        <Button onClick={() => navigate("/import")} text="Admin" icon={<Diagram2 size={24} />} fontSize="1.35vw" angle={90} style={{ padding: '0.8vw 1.5vw', width: '100%' }} />
                        <Button onClick={() => setShowQRCode(true)} text="Referee" icon={<PersonBadge size={24} />} fontSize="1.35vw" angle={180} style={{ padding: '0.8vw 1.5vw', width: '100%' }} />
                    </div>
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
