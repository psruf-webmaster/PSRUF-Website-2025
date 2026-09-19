import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './MemberProfile.css';

const Profiles = createContext(new Map());
export const MemberProfilesProvider = Profiles.Provider;
const list = value => (Array.isArray(value) ? value : value ? [value] : []);
const label = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
export const profileName = profile => `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
export function canShowProfileField(profile, field, visibility = {}) {
  const shared = profile?.privacy?.[field];
  const privateByDefault = ['phoneNumber', 'personalEmail'].includes(field);
  return visibility[field] !== false && shared !== false && (!privateByDefault || shared === true);
}

function Summary({ profile, name, avatar, large = false }) {
  const [failedAvatar, setFailedAvatar] = useState(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  const positions = list(profile.positions).map(p => label(typeof p === 'string' ? p : p?.title || p?.key)).filter(Boolean);
  return <span className={`member-identity${large ? ' member-identity-large' : ''}`}>
    <span className="member-photo-wrap">
      {avatar && failedAvatar !== avatar
        ? <img className="member-photo" src={avatar} alt={name} onError={() => setFailedAvatar(avatar)} />
        : <span className="member-initials" aria-hidden="true">{initials}</span>}
    </span>
    <span className="member-identity-copy">
      <span className="member-eyebrow">Member profile</span>
      <strong className="member-name">{name}</strong>
      {positions.length > 0 && <span className="member-positions">{positions.join(' · ')}</span>}
      <span className="member-tags">
        {list(profile.role).map(role => <span className="member-role" key={role}>{label(role)}</span>)}
        {list(profile.memberStatus).map(status => <span className={`member-status${status === 'active' ? ' member-status-active' : ''}`} key={status}><i aria-hidden="true" />{label(status)}</span>)}
      </span>
    </span>
  </span>;
}

export function MemberProfile({ userId, profile: fallback = {}, name: fallbackName = 'Member', avatar: fallbackAvatar, getAvatar, visibility = {}, hoverPreview = false, children }) {
  const profiles = useContext(Profiles);
  const profile = profiles.get(String(userId || '')) || fallback;
  const name = profileName(profile) || fallbackName;
  const avatar = getAvatar?.(profile) || profile.profilePicUrl || fallbackAvatar;
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const dialog = useRef(null);
  const previewId = useId();
  const [preview, setPreview] = useState(null);
  const hoverTimer = useRef(null);
  const clearHover = () => clearTimeout(hoverTimer.current);
  const hidePreview = () => { clearHover(); setPreview(null); };
  const queueHide = () => { clearHover(); hoverTimer.current = setTimeout(() => setPreview(null), 120); };
  const showPreview = () => {
    if (!hoverPreview || open) return;
    clearHover();
    hoverTimer.current = setTimeout(() => {
      const rect = trigger.current.getBoundingClientRect();
      // Anchor above the author so the message beneath remains readable.
      const height = Math.min(104, Math.max(0, rect.top - 16));
      if (height < 48) return;
      setPreview({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)), bottom: window.innerHeight - rect.top + 6, maxHeight: height });
    }, 220);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  useEffect(() => {
    if (!hoverPreview) return undefined;
    const dismiss = event => { if (event.type !== 'keydown' || event.key === 'Escape') { clearTimeout(hoverTimer.current); setPreview(null); } };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => { window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss); window.removeEventListener('keydown', dismiss); };
  }, [hoverPreview]);
  useEffect(() => {
    if (!open) return undefined;
    const returnFocus = trigger.current;
    const modal = dialog.current;
    modal.showModal();
    return () => { modal.close(); returnFocus?.focus(); };
  }, [open]);
  const showDetails = event => { event.stopPropagation(); hidePreview(); setOpen(true); };
  const fields = [['phoneNumber', 'Phone number'], ['ufEmail', 'UF email'], ['personalEmail', 'Personal email'], ['major', 'Major'], ['year', 'Year in school']];
  return <>
    <button ref={trigger} type="button" className="member-trigger" aria-label={`View ${name}'s profile`} aria-haspopup="dialog" aria-expanded={open} aria-describedby={preview ? previewId : undefined} onMouseEnter={showPreview} onMouseLeave={queueHide} onFocus={showPreview} onBlur={queueHide} onClick={showDetails}>{children || name}</button>
    {preview && !open && createPortal(<div id={previewId} role="tooltip" className="member-chat-preview" style={preview} onMouseEnter={clearHover} onMouseLeave={queueHide}><Summary profile={profile} name={name} avatar={avatar} /></div>, document.body)}
    {open && createPortal(<dialog ref={dialog} className="member-dialog" aria-label={`${name}'s profile`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="member-dialog-content">
        <button type="button" className="member-close" autoFocus onClick={() => setOpen(false)} aria-label="Close profile"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        <Summary profile={profile} name={name} avatar={avatar} large />
        <dl>{fields.filter(([field]) => canShowProfileField(profile, field, visibility)).map(([field, title]) => <React.Fragment key={field}><dt>{title}</dt><dd>{field === 'year' && /^[1-5]$/.test(String(profile[field])) ? `Year ${profile[field]}` : profile[field] || 'Not provided'}</dd></React.Fragment>)}</dl>
      </div>
    </dialog>, document.body)}
  </>;
}
