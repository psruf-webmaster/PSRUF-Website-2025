import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, Image, X } from 'react-feather';
import './MediaLightbox.css';

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
    <div className="media-lightbox" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section className="media-lightbox__dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Preview of ${item.name}`}>
        <header className="media-lightbox__header">
          <div className="media-lightbox__icon" aria-hidden="true"><Image size={21} /></div>
          <div className="media-lightbox__heading">
            <h2 title={item.name}>{item.name || 'Attachment'}</h2>
            <div className="media-lightbox__metadata">
              {authorName && <span>{authorName}</span>}
              {authorName && timeLabel && <span aria-hidden="true">·</span>}
              {timeLabel && <span>{timeLabel}</span>}
            </div>
          </div>
          <button className="media-lightbox__close" type="button" aria-label="Close media preview" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="media-lightbox__stage">
          {isVideoMedia(item) ? <video src={item.url} controls /> : <img src={item.url} alt={item.name} />}
        </div>
        <footer className="media-lightbox__footer">
          <a className="media-lightbox__original" href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />Open original file</a>
          <button className="media-lightbox__download" type="button" onClick={download} disabled={downloading}><Download size={17} aria-hidden="true" />{downloading ? 'Downloading…' : 'Download Asset'}</button>
          {error && <p className="media-lightbox__error" role="alert">{error}</p>}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
