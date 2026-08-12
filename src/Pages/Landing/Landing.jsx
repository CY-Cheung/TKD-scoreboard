import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Broadcast, QrCode, PersonBadge, Diagram3, Github, Google } from 'react-bootstrap-icons';
import { useAuth } from '../../Context/AuthContext';
import Button from '../../Components/Button/Button';
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { LANDING_FEATURES, LANDING_HERO } from '../../constants/landingFeatures';
import { toggleDoubleClickFullscreen } from '../../Utils/requestFullscreen';
import './Landing.css';

const REPO_URL = 'https://github.com/CY-Cheung/TKD-scoreboard';

const FEATURE_ICONS = {
    'live-sync': Broadcast,
    'scan-score': QrCode,
    'one-account': PersonBadge,
    'multi-court': Diagram3,
};

const FEATURES = LANDING_FEATURES.map((feature) => ({
    ...feature,
    Icon: FEATURE_ICONS[feature.id],
}));

function Landing() {
    const navigate = useNavigate();
    const { user, userLoading, googleLogin } = useAuth();
    const [authError, setAuthError] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    const { locale, visible } = useAlternatingLocale();

    useEffect(() => {
        if (userLoading) return;
        // Already signed in — skip marketing login and go set up a court.
        if (user) {
            navigate('/court-setup', { replace: true });
        }
    }, [user, userLoading, navigate]);

    const handleGoogleSignIn = async () => {
        setAuthError('');
        setSigningIn(true);
        try {
            await googleLogin();
            navigate('/court-setup');
        } catch (err) {
            console.error('Google Sign-In Error:', err);
            setAuthError({
                en: `Login failed: ${err.message}`,
                zh: `登入失敗：${err.message}`,
            });
        } finally {
            setSigningIn(false);
        }
    };

    return (
        <div className="landing-page aurora-bg" onDoubleClick={toggleDoubleClickFullscreen}>
            <main className="landing-main">
                <div className="landing-center">
                    <section className="landing-hero" id="landing-hero">
                    <div className="landing-hero-content">
                        <StableLocaleText
                            as="h1"
                            locale={locale}
                            visible={visible}
                            className="landing-hero-title"
                            en={LANDING_HERO.titleEn}
                            zh={LANDING_HERO.titleZh}
                        />
                        <StableLocaleText
                            as="p"
                            locale={locale}
                            visible={visible}
                            className="landing-hero-subtitle"
                            en={LANDING_HERO.subtitleEn}
                            zh={LANDING_HERO.subtitleZh}
                        />
                        <div className="landing-vspace" aria-hidden="true" />
                        <div className="landing-vspace" aria-hidden="true" />
                        {!user && (
                            <StableLocaleText
                                as="p"
                                locale={locale}
                                visible={visible}
                                className="landing-hero-login-hint"
                                en="No registration required. Just Google."
                                zh="無須註冊，Google 即可開賽。"
                            />
                        )}
                        <div className="google-btn-wrapper">
                            <Button
                                onClick={handleGoogleSignIn}
                                disabled={userLoading || signingIn}
                                icon={<Google size="1em" />}
                                fontSize="2cqi"
                                variant="gemini"
                                className="landing-google-btn"
                            >
                                <StableLocaleText
                                    as="span"
                                    locale={locale}
                                    visible={visible}
                                    en={signingIn ? 'Stepping in…' : 'Tap in・fight!'}
                                    zh={signingIn ? '正在入場…' : '一撳・即開打！'}
                                />
                            </Button>
                        </div>
                        {authError && (
                            <StableLocaleText
                                as="p"
                                locale={locale}
                                visible={visible}
                                className="landing-error"
                                en={authError.en}
                                zh={authError.zh}
                            />
                        )}
                    </div>
                </section>

                <div className="landing-vspace" aria-hidden="true" />
                <div className="landing-vspace" aria-hidden="true" />

                <section className="landing-trust-strip" aria-label="Key features">
                    <div className="landing-trust-grid">
                        {FEATURES.map(({ id, Icon, titleEn, titleZh, en, zh }) => (
                            <article key={id} className="landing-trust-card">
                                <div className="landing-trust-head">
                                    <Icon className="landing-trust-icon" aria-hidden />
                                    <StableLocaleText
                                        as="strong"
                                        locale={locale}
                                        visible={visible}
                                        className="landing-trust-title"
                                        en={titleEn}
                                        zh={titleZh}
                                    />
                                </div>
                                <StableLocaleText
                                    as="p"
                                    locale={locale}
                                    visible={visible}
                                    className="landing-trust-text"
                                    en={en}
                                    zh={zh}
                                />
                            </article>
                        ))}
                    </div>
                </section>
                </div>
            </main>

            <footer className="landing-footer">
                <a
                    className="landing-repo-link"
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Github className="landing-repo-icon" aria-hidden />
                    <span>GitHub Repository</span>
                </a>
            </footer>
        </div>
    );
}

export default Landing;
