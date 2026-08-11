import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';
import { resolveEventDisplayName } from '../../services/eventIndex';

import './Home.css';
import Button from '../../Components/Button/Button';
import QRCodeDisplay from '../../Components/QRCodeDisplay/QRCodeDisplay';
import MarqueeText from "../../Components/MarqueeText";
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { LANDING_FEATURES, LANDING_HERO } from '../../constants/landingFeatures';

// 引入 Bootstrap Icons
import { Display, Controller, Diagram2, PersonBadge, BoxArrowRight, ArrowLeftRight, Github } from 'react-bootstrap-icons';

function Home() {
    const navigate = useNavigate();
    const { user, googleLogout } = useAuth();
    const { session, clearEventSession } = useEventSession();
    const { locale, visible } = useAlternatingLocale();
    const [eventName, setEventName] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

    useEffect(() => {
        if (!session?.eventId) {
            setEventName('');
            return;
        }

        // Prefer light eventIndex; fall back to EventName leaf (not whole event tree)
        const indexRef = ref(database, `eventIndex/${session.eventId}`);
        get(indexRef).then((snapshot) => {
            if (snapshot.exists()) {
                setEventName(resolveEventDisplayName(snapshot.val(), session.eventId));
                return;
            }
            return get(ref(database, `events/${session.eventId}/EventName`)).then((nameSnap) => {
                if (nameSnap.exists()) {
                    setEventName(nameSnap.val() || session.eventId);
                } else {
                    setEventName(session.eventId);
                }
            });
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

    // Stay on /home until Court Setup mounts — session is cleared there.
    // Clearing session here lets ProtectedRoute interrupt the navigation.
    const handleGoToCourtSetup = () => {
        navigate('/court-setup', { replace: true });
    };

    // Full Google sign-out → Landing (Court Setup requires Google user)
    const handleGoogleLogout = async () => {
        try {
            await googleLogout();
        } catch (err) {
            console.error("Google logout error:", err);
        } finally {
            clearEventSession();
            navigate('/', { replace: true });
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
                        title="Sign Out of Google Account & Return to Landing"
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
                        <StableLocaleText
                            as="h1"
                            locale={locale}
                            visible={visible}
                            className="home-hero-title"
                            en={LANDING_HERO.titleEn}
                            zh={LANDING_HERO.titleZh}
                        />
                        <StableLocaleText
                            as="p"
                            locale={locale}
                            visible={visible}
                            className="home-subtitle"
                            en={LANDING_HERO.subtitleEn}
                            zh={LANDING_HERO.subtitleZh}
                        />
                        <ul className="home-app-intro-list">
                            {LANDING_FEATURES.map(({ id, titleEn, titleZh, en, zh }) => (
                                <li key={id} className="home-app-intro-item">
                                    <StableLocaleText
                                        as="div"
                                        locale={locale}
                                        visible={visible}
                                        className="home-app-intro-title"
                                        en={titleEn}
                                        zh={titleZh}
                                    />
                                    <StableLocaleText
                                        as="div"
                                        locale={locale}
                                        visible={visible}
                                        className="home-app-intro-desc"
                                        en={en}
                                        zh={zh}
                                    />
                                </li>
                            ))}
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
                    <div style={{ width: '100%', textAlign: 'center', marginBottom: '1.5cqi' }}>
                        {(() => {
                            const fullEventName = session?.eventName || eventName || session?.eventId || 'N/A';
                            let mainEventName = fullEventName;
                            let eventDateStr = '';
                            
                            // Helper to normalize DD/MM/YYYY to YYYY/MM/DD
                            const normalizeDate = (dateStr) => {
                                const ddMMyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                if (ddMMyyyyMatch) {
                                    return `${ddMMyyyyMatch[3]}/${ddMMyyyyMatch[2].padStart(2, '0')}/${ddMMyyyyMatch[1].padStart(2, '0')}`;
                                }
                                return dateStr;
                            };

                            const matchDouble = fullEventName.match(/^(.*?)\s*\((Day[^)]+)\)\s*\(([^)]+)\)\s*$/i);
                            if (matchDouble) {
                                mainEventName = matchDouble[1].trim();
                                eventDateStr = `${matchDouble[2].trim()} - ${normalizeDate(matchDouble[3].trim())}`;
                            } else {
                                const matchSingle = fullEventName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                                if (matchSingle) {
                                    mainEventName = matchSingle[1].trim();
                                    eventDateStr = normalizeDate(matchSingle[2].trim());
                                }
                            }
                            
                            return (
                                <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center' }}>
                                    <MarqueeText 
                                      text={mainEventName} 
                                      style={{ fontSize: '1.6cqi', color: 'white', fontWeight: 'bold', width: '100%' }} 
                                    />
                                    {eventDateStr && (
                                        <div style={{ fontSize: '1.6cqi', color: '#fff', marginTop: '0.4cqi', fontWeight: 'bold' }}>
                                            {eventDateStr}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {/* Empty line space */}
                        <div style={{ height: '1cqi' }}></div>
                        <div className="home-court-row">
                            <StableLocaleText
                                as="div"
                                locale={locale}
                                visible={visible}
                                className="home-court-label"
                                en={`Court ${session?.courtId?.toString().replace(/court\s*/i, '').trim() || 'N/A'}`}
                                zh={`場地 ${session?.courtId?.toString().replace(/court\s*/i, '').trim() || 'N/A'}`}
                            />
                            <Button
                                onClick={handleGoToCourtSetup}
                                className="home-court-setup-btn"
                                icon={<ArrowLeftRight size="1cqi" />}
                                fontSize="1.05cqi"
                                angle={0}
                                style={{ padding: '0.55cqi 0.95cqi', margin: 0, width: 'auto', whiteSpace: 'nowrap' }}
                            >
                                <StableLocaleText as="span" locale={locale} visible={visible} en="Court Setup" zh="場地設置" />
                            </Button>
                        </div>
                    </div>

                    <div className="home-nav-container">
                        <Button
                            onClick={() => navigate("/screen")}
                            icon={<Display size="1.25cqi" />}
                            fontSize="1.35cqi"
                            gradient={
                                'linear-gradient(90deg, ' +
                                'var(--red-secondary) 0%, ' +
                                'var(--red-primary) 5%, ' +
                                'var(--red-primary) 36%, ' +
                                'var(--yellow-primary) 42%, ' +
                                'var(--yellow-primary) 58%, ' +
                                'var(--blue-primary) 64%, ' +
                                'var(--blue-primary) 95%, ' +
                                'var(--blue-secondary) 100%)'
                            }
                            style={{ padding: '0.8cqi 1.5cqi' }}
                        >
                            <StableLocaleText as="span" locale={locale} visible={visible} en="Scoreboard" zh="分牌顯示" />
                        </Button>
                        <Button onClick={() => navigate("/import")} icon={<Diagram2 size="1.25cqi" />} fontSize="1.35cqi" angle={90} style={{ padding: '0.8cqi 1.5cqi' }}>
                            <StableLocaleText as="span" locale={locale} visible={visible} en="Manage Match" zh="管理賽事" />
                        </Button>
                        <Button onClick={() => setShowQRCode(true)} icon={<PersonBadge size="1.25cqi" />} fontSize="1.35cqi" angle={180} style={{ padding: '0.8cqi 1.5cqi' }}>
                            <StableLocaleText as="span" locale={locale} visible={visible} en="Corner Judge" zh="邊裁設定" />
                        </Button>
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
