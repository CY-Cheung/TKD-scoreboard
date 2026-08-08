import React, { createContext, useContext, useState, useRef } from 'react';
import Button from '../Components/Button/Button';
import { ExclamationTriangle, XCircle, CheckCircle } from 'react-bootstrap-icons';

const PopupContext = createContext(null);

export const usePopup = () => useContext(PopupContext);

export const PopupProvider = ({ children }) => {
    // Toast State
    const [toastMessage, setToastMessage] = useState(null);
    const toastTimeoutRef = useRef(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
    });

    const showToast = (message) => {
        setToastMessage(message);
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    const showConfirm = ({ title = 'Confirm', message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm,
            confirmText,
            cancelText
        });
    };

    const closeConfirm = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = () => {
        if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
        }
        closeConfirm();
    };

    return (
        <PopupContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    top: '2cqi',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: '0.78cqi 1.56cqi',
                    borderRadius: '2.6cqi',
                    zIndex: 9999,
                    fontSize: '1cqi',
                    boxShadow: '0 0.4cqi 1cqi rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {toastMessage}
                </div>
            )}

            {/* Confirm Modal Overlay */}
            {confirmModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#221515',
                        border: '1px solid rgba(255, 59, 48, 0.5)',
                        borderRadius: '0.62cqi',
                        padding: '1.3cqi',
                        width: '90%',
                        maxWidth: '30cqi',
                        color: '#fff',
                        boxShadow: '0 0.52cqi 2.08cqi rgba(255, 59, 48, 0.3)',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.52cqi', color: '#ff3b30', fontSize: '1.3cqi' }}>
                            <ExclamationTriangle size="1.46cqi" /> {confirmModal.title}
                        </h3>
                        <p style={{ fontSize: '1cqi', lineHeight: '1.5', color: '#ddd' }}>
                            {confirmModal.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.62cqi', marginTop: '1.04cqi' }}>
                            <Button 
                                onClick={closeConfirm}
                                text={confirmModal.cancelText}
                                fontSize="0.9cqi"
                                angle={0}
                                icon={<XCircle size="0.9cqi" />}
                            />
                            <Button 
                                onClick={handleConfirm}
                                text={confirmModal.confirmText}
                                icon={<CheckCircle size="0.9cqi" />}
                                fontSize="0.9cqi"
                                angle={350}
                            />
                        </div>
                    </div>
                </div>
            )}
        </PopupContext.Provider>
    );
};
