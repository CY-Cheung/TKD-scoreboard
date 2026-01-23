import React from 'react';
import { useAuth } from '../../Context/AuthContext';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';
import './Login.css';

const Login = () => {
    const { login, authError, loading, user } = useAuth();

    return (
        <div className="login-container">
            <Squares
                speed={0.5}
                squareSize={100}
                direction="diagonal"
                borderColor="hsla(270, 50%, 50%, 0.25)"
                hoverFillColor="hsla(60, 50%, 50%, 0.25)"
            />
            <div className="login-content-wrapper">
                <div className="login-box">
                    <h2>Login Required</h2>
                    <p>Please log in with your authorized Google account to access this application.</p>
                    <div className="login-action-buttons">
                        <Button text="Login with Google" fontSize="1.5dvw" angle={270} onClick={login} />
                    </div>
                    {/* --- Debug Information --- */}
                    <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', background: '#f0f0f0' }}>
                        <h4 style={{margin: 0, marginBottom: '10px'}}>Debugging Info:</h4>
                        <p style={{margin: 0}}><strong>Loading:</strong> {loading.toString()}</p>
                        <p style={{margin: 0}}><strong>User Email:</strong> {user ? user.email : 'null'}</p>
                        <p style={{margin: 0}}><strong>Auth Error:</strong> {authError || 'null'}</p>
                    </div>
                    {/* --- End of Debug Info --- */}
                    {authError && <p className="error-message">{authError}</p>}
                </div>
            </div>
        </div>
    );
};

export default Login;
