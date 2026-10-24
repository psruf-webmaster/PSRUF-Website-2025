import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function isVideoMedia(item) {
  return item.type === 'video' || item.type?.startsWith('video/') || /\.(mp4|webm|ogg|mov)(?:[?#]|$)/i.test(item.url) || item.url.includes('video');
}

export default function MediaLightbox({ item, authorName, timeLabel, onClose }) {
  const dialogRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current.querySelector('button').focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), a[href], video[controls]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Download failed');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name || 'Attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Unable to download this asset. Open the original file to save it.');
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(12, 8, 10, 0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Preview of ${item.name}`} style={{ width: 'min(100%, 1200px)', maxHeight: '100%', overflowY: 'auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <strong>{authorName}</strong>
            <div>{timeLabel}</div>
            <div>{item.name}</div>
          </div>
          <button type="button" aria-label="Close media preview" onClick={onClose} style={{ fontSize: 30, color: '#fff', background: 'transparent', border: 0, cursor: 'pointer' }}>×</button>
        </header>
        {isVideoMedia(item)
          ? <video src={item.url} controls style={{ width: '100%', maxHeight: '70dvh', background: '#000' }} />
          : <img src={item.url} alt={item.name} style={{ width: '100%', maxHeight: '70dvh', objectFit: 'contain' }} />}
        <footer>
          <button type="button" onClick={download} disabled={downloading} style={{ padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}>{downloading ? 'Downloading…' : 'Download Asset'}</button>
          {error && <p role="alert">{error} <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}>Open original file</a></p>}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
