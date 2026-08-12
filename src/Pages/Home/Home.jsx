import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';
import { resolveEventDisplayName } from '../../services/eventIndex';

import './Home.css';
import BrandSplitLayout from '../../Components/BrandSplit/BrandSplitLayout';
import QRCodeDisplay from '../../Components/QRCodeDisplay/QRCodeDisplay';
import { useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import HomeRightPanel from './HomeRightPanel';
import { toggleDoubleClickFullscreen } from '../../Utils/requestFullscreen';

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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'q' || e.key === 'Q') {
                setShowQRCode((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleGoToCourtSetup = () => {
        navigate('/court-setup', { replace: true });
    };

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

    const fullEventName = session?.eventName || eventName || session?.eventId || 'N/A';

    return (
        <div className="home aurora-bg" onDoubleClick={toggleDoubleClickFullscreen}>
            <BrandSplitLayout
                locale={locale}
                visible={visible}
                user={user}
                onLogout={handleGoogleLogout}
                rightVariant="home"
                className="home-content"
            >
                <HomeRightPanel
                    locale={locale}
                    visible={visible}
                    fullEventName={fullEventName}
                    courtId={session?.courtId}
                    onCourtSetup={handleGoToCourtSetup}
                    onScoreboard={() => navigate("/screen")}
                    onManageMatch={() => navigate("/import")}
                    onCornerJudge={() => setShowQRCode(true)}
                />
            </BrandSplitLayout>

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
