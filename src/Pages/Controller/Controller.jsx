import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, set } from "firebase/database";
import './Controller.css';
import Button from '../../Components/Button/Button';

// Define point types and their values
const pointTypes = {
    punch: { value: 1, label: 'Punch (+1)' },
    body: { value: 2, label: 'Body (+2)' },
    head: { value: 3, label: 'Head (+3)' },
    bodyTurn: { value: 4, label: 'Turn Body (+4)' },
    headTurn: { value: 5, label: 'Turn Head (+5)' },
    gamjeom: { value: -1, label: 'Gam-jeom' }, // Special case for deductions
};

function Controller() {
    const [event, setEvent] = useState(null);
    const [court, setCourt] = useState(null);
    const [role, setRole] = useState(null);
    const [error, setError] = useState('');
    const [lastAction, setLastAction] = useState(null);

    // 1. Get referee identity from localStorage
    useEffect(() => {
        const storedEvent = localStorage.getItem('referee_event');
        const storedCourt = localStorage.getItem('referee_court');
        const storedRole = localStorage.getItem('referee_role');

        if (storedEvent && storedCourt && storedRole) {
            setEvent(storedEvent);
            setCourt(storedCourt);
            setRole(storedRole);
        } else {
            setError('Session not found. Please re-scan QR code.');
        }
    }, []);

    // 2. The "Fire and Forget" scoring function
    const handleScore = (color, type) => {
        if (error) return; // Don't proceed if there's an initialization error

        const queuePath = `judgingQueue/${event}/${court}/${color}/${type}/${role}`;
        const scoreData = { 
            timestamp: Date.now(), 
            value: pointTypes[type].value 
        };

        set(ref(database, queuePath), scoreData)
            .then(() => {
                const actionMessage = `${color.charAt(0).toUpperCase() + color.slice(1)} ${pointTypes[type].label}`;
                setLastAction(actionMessage);
                // Vibrate for feedback on supported devices
                if ('vibrate' in navigator) {
                    navigator.vibrate(100); // Vibrate for 100ms
                }
                setTimeout(() => setLastAction(null), 1500); // Clear message after 1.5s
            })
            .catch((err) => {
                console.error("Failed to send score:", err);
                setError("Connection error. Could not send score.");
            });
    };

    if (error) {
        return <div className="controller-error"><p>{error}</p></div>;
    }

    return (
        <div className="controller" >
            <div className="controller-header">
                <p>{event} / {court}</p>
                <h3>{role}</h3>
            </div>

            {/* Red Player Column */}
            <div className="col red">
                <Button text="Head Turn (+5)" angle={10} fontSize="3.5vw" onClick={() => handleScore('red', 'headTurn')} />
                <Button text="Body Turn (+4)" angle={10} fontSize="3.5vw" onClick={() => handleScore('red', 'bodyTurn')} />
                <Button text="Head (+3)" angle={10} fontSize="3.5vw" onClick={() => handleScore('red', 'head')} />
                <Button text="Body (+2)" angle={10} fontSize="3.5vw" onClick={() => handleScore('red', 'body')} />
                <Button text="Punch (+1)" angle={10} fontSize="3.5vw" onClick={() => handleScore('red', 'punch')} />
            </div>

            {/* Center Column for Gam-jeom */}
            <div className="col center">
                 <Button text="Gam-jeom" color="yellow" angle={0} fontSize="3vw" onClick={() => handleScore('red', 'gamjeom')} />
                 <div className="feedback-zone">
                    {lastAction}
                 </div>
                 <Button text="Gam-jeom" color="yellow" angle={0} fontSize="3vw" onClick={() => handleScore('blue', 'gamjeom')} />
            </div>

            {/* Blue Player Column */}
            <div className="col blue">
                <Button text="Head Turn (+5)" angle={-10} fontSize="3.5vw" onClick={() => handleScore('blue', 'headTurn')} />
                <Button text="Body Turn (+4)" angle={-10} fontSize="3.5vw" onClick={() => handleScore('blue', 'bodyTurn')} />
                <Button text="Head (+3)" angle={-10} fontSize="3.5vw" onClick={() => handleScore('blue', 'head')} />
                <Button text="Body (+2)" angle={-10} fontSize="3.5vw" onClick={() => handleScore('blue', 'body')} />
                <Button text="Punch (+1)" angle={-10} fontSize="3.5vw" onClick={() => handleScore('blue', 'punch')} />
            </div>

        </div>
    );
}

export default Controller;
