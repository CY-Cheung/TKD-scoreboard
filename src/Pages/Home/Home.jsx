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


    const toggleFullScreen = (e) => {
        if (e.target === e.currentTarget) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    };
    return (
        <div className="home aurora-bg" onDoubleClick={toggleFullScreen}>

            {/* --- Top Right User Profile Info Card --- */}
            <div className="home-content glass-card split-layout">
            {user && (
                <div style={{ position: 'absolute', bottom: '1.5cqi', right: '1.5cqi', zIndex: 50, backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.52cqi 0.78cqi', borderRadius: '0.78cqi', backdropFilter: 'blur(0.52cqi)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.62cqi', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="User Avatar" style={{ width: '1.66cqi', height: '1.66cqi', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '1.66cqi', height: '1.66cqi', borderRadius: '50%', backgroundColor: '#6c5ce7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85cqi' }}>
                                {user.displayName?.[0] || 'U'}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.77cqi', lineHeight: '1.2' }}>{user.displayName || 'User'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.64cqi', lineHeight: '1.2' }}>{user.email}</div>
                        </div>
                    </div>
                    <Button 
                        onClick={handleGoogleLogout}
                        title="Sign Out of Google Account & Redirect to Court Setup"
                        fontSize="0.72cqi"
                        variant="orange"
                        icon={<BoxArrowRight size="0.73cqi" />}
                        text="Logout (登出)"
                        style={{ padding: '0.31cqi 0.62cqi', minWidth: 'auto', margin: 0 }}
                    />
                </div>
            )}

                <div className="home-left-panel">
                    <div className="home-title-container">
                        <h1 style={{fontSize: '3.5cqi', lineHeight: '1.1'}}>Taekwondo<br/>Scoreboard</h1>
                        <div style={{fontSize: '1.5cqi', color: '#fbc531', margin: '0.3cqi 0 0 0', fontWeight: '700', letterSpacing: '0.3cqi', textTransform: 'uppercase'}}>Kyorugi</div>
                        <h2 style={{fontSize: '1.5cqi', color: 'rgba(255,255,255,0.9)', margin: '0.8cqi 0 0 0', fontWeight: 'normal', letterSpacing: '0.1cqi'}}>跆拳道搏擊比賽計分系統</h2>
                        <ul className="home-app-intro-list">
                            <li><strong>無須安裝 App</strong>：手機掃描 QR Code 即刻化身遙控器，隨時隨地開始計分。</li>
                            <li><strong>防重複加分機制</strong>：多裁判模式下需於 1 秒內一致畀分先算有效，確保計分公平。</li>
                            <li><strong>智能動態對戰表</strong>：一鍵匯入官方 PDF 賽程，自動生成實時更新嘅淘汰賽晉級圖。</li>
                            <li><strong>自動連線監控</strong>：智能鎖定裁判席位，斷線即時警示並自動調整模式，比賽絕不中斷。</li>
                        </ul>
                    </div>
                    <div className="home-footer-links">
                        <a href="https://github.com/CY-Cheung/TKD-scoreboard" target="_blank" rel="noopener noreferrer">
                            <Github size="0.83cqi" /> GitHub Repository
                        </a>
                    </div>
                </div>

                <div className="home-divider"></div>

                <div className="home-right-panel">
                    <div style={{ width: '100%', textAlign: 'left', marginBottom: '1.5cqi' }}>
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
                                    <h3 style={{ fontSize: '1.6cqi', color: 'white', margin: '0 0 0.5cqi 0', fontWeight: 'bold', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {mainEventName}
                                    </h3>
                                    {eventDateStr && (
                                        <div style={{ fontSize: '1.6cqi', color: '#fff', marginBottom: '0.5cqi' }}>
                                            {eventDateStr}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                        <div style={{ fontSize: '1.6cqi', color: 'rgba(255,255,255,0.9)', marginTop: '0.5cqi' }}>
                            Court: <strong style={{ color: '#fff' }}>{session?.courtId || 'N/A'}</strong>
                        </div>
                    </div>

                    <div className="home-nav-container">
                        <Button onClick={handleSessionLogout} text="Court Setup (場地設置)" icon={<ArrowLeftRight size="1.25cqi" />} fontSize="1.35cqi" angle={0} style={{ padding: '0.8cqi 1.5cqi', width: '100%' }} />
                        <Button onClick={() => navigate("/screen")} text="Screen (顯示屏)" icon={<Display size="1.25cqi" />} fontSize="1.35cqi" angle={50} style={{ padding: '0.8cqi 1.5cqi', width: '100%' }} />
                        <Button onClick={() => navigate("/import")} text="Admin (管理後台)" icon={<Diagram2 size="1.25cqi" />} fontSize="1.35cqi" angle={90} style={{ padding: '0.8cqi 1.5cqi', width: '100%' }} />
                        <Button onClick={() => setShowQRCode(true)} text="Referee (裁判控制)" icon={<PersonBadge size="1.25cqi" />} fontSize="1.35cqi" angle={180} style={{ padding: '0.8cqi 1.5cqi', width: '100%' }} />
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
