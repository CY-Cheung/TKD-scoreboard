import React, { useState, useEffect, useRef } from 'react';
import './AlternatingLocale.css';

export const LOCALE_HOLD_MS = 5000;
export const LOCALE_FADE_MS = 500;

export function useAlternatingLocale() {
    const [locale, setLocale] = useState('en');
    const [visible, setVisible] = useState(true);
    const fadeTimeoutRef = useRef(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setVisible(false);
            fadeTimeoutRef.current = setTimeout(() => {
                setLocale((prev) => (prev === 'en' ? 'zh' : 'en'));
                setVisible(true);
            }, LOCALE_FADE_MS);
        }, LOCALE_HOLD_MS + LOCALE_FADE_MS);

        return () => {
            clearInterval(intervalId);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
    }, []);

    return { locale, visible };
}

export function StableLocaleText({ en, zh, locale, visible, className = '', as: Tag = 'div', ...restProps }) {
    const enActive = locale === 'en' && visible;
    const zhActive = locale === 'zh' && visible;

    return (
        <Tag className={`locale-slot${className ? ` ${className}` : ''}`} {...restProps}>
            <span
                className={`locale-layer locale-fade-text${enActive ? ' is-visible' : ''}`}
                lang="en"
                aria-hidden={!enActive}
            >
                {en}
            </span>
            <span
                className={`locale-layer locale-fade-text${zhActive ? ' is-visible' : ''}`}
                lang="zh-Hant"
                aria-hidden={!zhActive}
            >
                {zh}
            </span>
        </Tag>
    );
}
