import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, set } from "firebase/database";
import { QRCodeSVG } from 'qrcode.react';
import './RefereeRegister.css';
import Button from '../../Components/Button/Button';

const generateKey = () => Math.random().toString(36).substring(2, 10);

function RefereeRegister() {
    const [courtId, setCourtId] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [accessKey, setAccessKey] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const storedCourtId = localStorage.getItem('courtId');
        const storedEvent = localStorage.getItem('selectedEvent');

        if (storedCourtId && storedEvent) {
            setCourtId(storedCourtId);
            setSelectedEvent(storedEvent);
            const newKey = generateKey();
            setAccessKey(newKey);

            const accessKeyRef = ref(database, `events/${storedEvent}/courts/${storedCourtId}/accessKey`);
            set(accessKeyRef, newKey).catch((err) => {
                console.error("Failed to store access key:", err);
                setError("Failed to write access key to the database.");
            });
        } else {
            setError("Court or Event not found. Please return to Court Setup.");
        }
    }, []);

    const roles = [
        { id: 'judge1', name: 'Judge 1' },
        { id: 'judge2', name: 'Judge 2' },
        { id: 'judge3', name: 'Judge 3' },
    ];

    const getLoginUrl = (roleId) => {
        if (!accessKey || !selectedEvent || !courtId) return '';
        const url = new URL(`${window.location.origin}/referee/login`);
        url.searchParams.append('event', selectedEvent);
        url.searchParams.append('court', courtId);
        url.searchParams.append('role', roleId);
        url.searchParams.append('key', accessKey);
        return url.toString();
    };

    return (
        <div className="rr-container">
            <div className="rr-content"> 
                <div className="rr-header">
                    <h1>Referee Registration</h1>
                    {selectedEvent && courtId && (
                        <p>Scan the appropriate QR code to join <strong>{selectedEvent}</strong> on <strong>Court {courtId.slice(-1)}</strong></p>
                    )}
                </div>

                {error && <p className="rr-error">{error}</p>}

                {!accessKey && !error && <p className="rr-loading">Generating session key...</p>}

                {accessKey && (
                    <div className="rr-qr-grid">
                        {roles.map(role => (
                            <div className="rr-qr-card" key={role.id}>
                                <h3>{role.name}</h3>
                                <div className="rr-qr-code-wrapper">
                                    <QRCodeSVG 
                                        value={getLoginUrl(role.id)} 
                                        bgColor={"#ffffff"}
                                        fgColor={"#000000"}
                                        level={"L"} 
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="rr-role-id">Role: {role.id}</p>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="rr-button-container">
                    <Button text="Back to Home" fontSize="1.5dvw" angle={0} onClick={() => navigate('/')} />
                </div>
            </div>
        </div>
    );
}

export default RefereeRegister;
