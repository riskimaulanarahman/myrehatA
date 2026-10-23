import React, { useEffect, useState } from 'react';

/**
 * Confirmation Modal Component
 * Similar to the old system's showConfirmModal
 */
export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  type = 'primary' 
}) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    primary: '❓',
    danger: '⚠️',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div 
      className="afmp-confirm-modal" 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 999999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: windowWidth <= 1024 ? '15px' : '20px',
        overflowY: 'auto',
      }}
    >
      <div 
        className="afmp-confirm-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: windowWidth <= 480 ? '15px' : windowWidth <= 768 ? '20px' : '25px',
          maxWidth: '450px',
          width: windowWidth <= 480 ? 'calc(100% - 40px)' : windowWidth <= 768 ? 'calc(100% - 40px)' : windowWidth <= 1024 ? '85%' : '90%',
          maxHeight: windowWidth <= 1024 ? '85vh' : 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'modalFadeIn 0.2s ease-out',
          margin: 'auto',
        }}
      >
        <h3 style={{
          margin: '0 0 15px 0',
          color: '#1d2327',
          fontSize: windowWidth <= 480 ? '16px' : '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          wordBreak: 'break-word',
        }}>
          <span>{icons[type] || icons.primary}</span>
          {title}
        </h3>
        <div 
          className="message" 
          style={{
            marginBottom: '20px',
            lineHeight: '1.5',
            color: '#50575e',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
        <div 
          className="buttons"
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            flexWrap: windowWidth <= 480 ? 'wrap' : 'nowrap',
          }}
        >
          <button
            className="button secondary cancel-btn"
            onClick={onClose}
            style={{
              padding: windowWidth <= 480 ? '10px 16px' : '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: windowWidth <= 480 ? '13px' : '14px',
              fontWeight: 500,
              background: '#f6f7f7',
              color: '#50575e',
              flex: windowWidth <= 480 ? '1 1 100%' : 'none',
              minWidth: windowWidth <= 480 ? '100%' : 'auto',
              width: windowWidth <= 480 ? '100%' : 'auto',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f6f7f7';
            }}
          >
            {cancelText}
          </button>
          <button
            className={`button ${type} confirm-btn`}
            onClick={handleConfirm}
            style={{
              padding: windowWidth <= 480 ? '10px 16px' : '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: windowWidth <= 480 ? '13px' : '14px',
              fontWeight: 500,
              background: type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#007cba',
              color: 'white',
              flex: windowWidth <= 480 ? '1 1 100%' : 'none',
              minWidth: windowWidth <= 480 ? '100%' : 'auto',
              width: windowWidth <= 480 ? '100%' : 'auto',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = type === 'danger' ? '#c82333' : type === 'warning' ? '#e0a800' : '#005a87';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#007cba';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

