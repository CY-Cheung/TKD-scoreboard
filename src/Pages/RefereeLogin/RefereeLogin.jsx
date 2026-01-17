import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get } from "firebase/database";
import './RefereeLogin.css';

// A custom hook to parse query parameters from the URL
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function RefereeLogin() {
    const [status, setStatus] = useState('Validating...');
    const query = useQuery();
    const navigate = useNavigate();

    useEffect(() => {
        const event = query.get('event');
        const court = query.get('court');
        const role = query.get('role');
        const key = query.get('key');

        if (!event || !court || !role || !key) {
            setStatus('Error: Missing required information in the link.');
            return;
        }

        const validateAccessKey = async () => {
            const accessKeyRef = ref(database, `events/${event}/courts/${court}/accessKey`);
            try {
                const snapshot = await get(accessKeyRef);
                if (snapshot.exists()) {
                    const correctKey = snapshot.val();
                    if (key === correctKey) {
                        // Key is correct, store info and navigate
                        setStatus('Validation successful! Redirecting...');
                        localStorage.setItem('referee_event', event);
                        localStorage.setItem('referee_court', court);
                        localStorage.setItem('referee_role', role);
                        // **MODIFIED**: Redirect to the controller (the actual referee pad)
                        navigate('/controller');
                    } else {
                        // Key is incorrect
                        setStatus('Error: Invalid or expired access key. Please scan a new QR code.');
                    }
                } else {
                    // No access key found in the database
                    setStatus('Error: This court has not been properly configured. No access key found.');
                }
            } catch (err) {
                console.error("Validation Error:", err);
                setStatus('Error: Could not connect to the database to validate the key.');
            }
        };

        validateAccessKey();

    }, [query, navigate]);

    return (
        <div className="rl-container">
            <div className="rl-status-box">
                <h1>Referee Login</h1>
                <p className="rl-status-message">{status}</p>
                {status.startsWith('Error') && (
                    <button className="rl-retry-button" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
}

export default RefereeLogin;
