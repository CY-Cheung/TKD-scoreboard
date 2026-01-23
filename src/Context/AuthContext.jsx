import React, { createContext, useState, useEffect, useContext } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

const ALLOWED_EMAIL = 'mynameisc.y.cheung@gmail.com';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Start as true
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        // This effect will run on mount and handle the initial auth state
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("Auth state changed: ", firebaseUser);
            if (firebaseUser && firebaseUser.email === ALLOWED_EMAIL) {
                setUser(firebaseUser);
                setAuthError(null);
            } else {
                // If a user is signed in but not the allowed one, sign them out.
                if (firebaseUser) {
                    signOut(auth);
                    setAuthError('Access denied. Please use the authorized Google account.');
                }
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const login = async () => {
        setLoading(true);
        setAuthError(null);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // The onAuthStateChanged observer will handle the user state update
            if (result.user.email !== ALLOWED_EMAIL) {
              await signOut(auth);
              setUser(null);
              setAuthError('Access denied. Please use the authorized Google account.');
            }
        } catch (error) {
            console.error("Error during popup sign-in:", error);
            setAuthError(`Popup sign-in error: ${error.message}`);
            setUser(null);
            setLoading(false);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setAuthError(null);
    };

    const isAuthenticated = () => !!user;

    const value = {
        user,
        login,
        logout,
        isAuthenticated,
        loading,
        authError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
