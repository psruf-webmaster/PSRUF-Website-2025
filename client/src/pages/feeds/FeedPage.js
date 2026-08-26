import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const socket = io('http://localhost:5000');

const FEED_TITLES = {
  chapterAnnouncements: 'Chapter Announcements',
  penguinParties: 'Penguin Parties',
  officerFeed: 'Officer Feed',
  alumniFeed: 'Alumni Feed',
};

const EMOJI_OPTIONS = ['😀', '😂', '😍', '🎉', '🔥', '💬', '👍', '💪', '❤️', '😎', '✨', '✅'];
const ROLE_OPTIONS = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev',
];
const MEMBER_STATUS_OPTIONS = [
  'active', 'inactive', 'earlyAlumni', 'seniorStatus',
  'co-op', 'dropped',
];
const SMS_ALLOWED_POSITION_KEYS = ['VP_COMMUNICATIONS', 'WEBMASTER'];
const SPRING_TRANSITION = { type: 'spring', stiffness: 360, damping: 22 };

function getViewportFlags() {
  if (typeof window === 'undefined') {
    return { isNarrow: false, isPhone: false };
  }
  return {
    isNarrow: window.innerWidth <= 980,
    isPhone: window.innerWidth <= 640,
  };
}

function useViewportFlags() {
  const [viewport, setViewport] = useState(getViewportFlags);

  useEffect(() => {
    const handleResize = () => setViewport(getViewportFlags());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}

function slugify(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  return parts
    .map((p, i) => {
      const low = p.toLowerCase();
      if (i === 0) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join('');
}

function isOfficerLevel(user) {
  if (!user) return false;
  if (user.isOfficer || user.isExec || user.isWebmaster) return true;
  const roles = Array.isArray(user.role) ? user.role.map(r => String(r).toLowerCase())
                                         : [String(user.role || '').toLowerCase()];
  return roles.some(r =>
    r.includes('officer') ||
    r.includes('exec') ||
    r.includes('webmaster') ||
    r.includes('vp_comm') ||
    r.includes('vp comm') ||
    r.includes('vpcommunications') ||
    r.includes('vp communications')
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getUserAvatarUrl(userLike) {
  if (!userLike) return '';
  return userLike.profilePicUrl || userLike.profilePicture || userLike.avatar || userLike.imageUrl || userLike.photoUrl || userLike.headshot || '';
}

function getCurrentUserAvatar(userLike) {
  return getUserAvatarUrl(userLike) || userLike?.profileUrl || userLike?.picture || '';
}

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function applyCurrentProfilesToPosts(items, profilesById) {
  return (Array.isArray(items) ? items : []).map(post => {
    const currentAuthor = profilesById.get(String(post?.authorId || ''));
    const nextComments = (Array.isArray(post?.comments) ? post.comments : []).map(comment => {
      const currentCommentAuthor = profilesById.get(String(comment?.userId || ''));
      const nextReplies = (Array.isArray(comment?.replies) ? comment.replies : []).map(reply => {
        const currentReplyAuthor = profilesById.get(String(reply?.userId || ''));
        return currentReplyAuthor
          ? {
              ...reply,
              avatarUrl: currentReplyAuthor.profilePicUrl || currentReplyAuthor.avatar || '',
              user: currentReplyAuthor,
            }
          : reply;
      });

      return currentCommentAuthor
        ? {
            ...comment,
            avatarUrl: currentCommentAuthor.profilePicUrl || currentCommentAuthor.avatar || '',
            user: currentCommentAuthor,
            replies: nextReplies,
          }
        : { ...comment, replies: nextReplies };
    });

    return currentAuthor
      ? {
          ...post,
          authorAvatar: currentAuthor.profilePicUrl || currentAuthor.avatar || '',
          author: currentAuthor,
          comments: nextComments,
        }
      : { ...post, comments: nextComments };
  });
}

function shouldGroupAdjacentPosts(previousPost, currentPost) {
  if (!previousPost || !currentPost) return false;
  if (String(previousPost.authorId || '') !== String(currentPost.authorId || '')) return false;

  const previousTime = new Date(previousPost.createdAt).getTime();
  const currentTime = new Date(currentPost.createdAt).getTime();
  if (Number.isNaN(previousTime) || Number.isNaN(currentTime)) return true;

  return currentTime - previousTime <= 10 * 60 * 1000;
}

function ActionIcon({ name, size = 13 }) {
  const baseProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'react') {
    return (
      <svg {...baseProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14.5c.9 1.2 2 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
      </svg>
    );
  }
  if (name === 'reply') {
    return (
      <svg {...baseProps}>
        <path d="M9 17l-5-5 5-5" />
        <path d="M20 18c0-5-3-8-11-8H4" />
      </svg>
    );
  }
  if (name === 'edit') {
    return (
      <svg {...baseProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }
  if (name === 'delete') {
    return (
      <svg {...baseProps}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    );
  }
  if (name === 'plus') {
    return (
      <svg {...baseProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }
  return (
    <svg {...baseProps}>
      <path d="M5 12h14" />
    </svg>
  );
}

function ChatAvatar({ src, name, size, fontSize, style = {} }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#fbf2f6',
        border: '1px solid rgba(109,44,44,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6d2c2c',
        fontWeight: 700,
        fontSize,
        flexShrink: 0,
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(109,44,44,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', color: '#3b2327', fontSize: 18 }}>{title}</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(109,44,44,0.2)',
              color: '#6d2c2c',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: '#b91c1c',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Manage Channels Modal Component to explicitly pop up when requested
function ManageChannelsModal({ open, onClose, channels, onRefresh, onError, userId }) {
  const [activeTab, setActiveTab] = useState('list');
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');

  if (!open) return null;

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ name: createName, slug: createSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message || 'Failed to create channel');
        return;
      }
      setCreateName('');
      setCreateSlug('');
      onRefresh();
      setActiveTab('list');
    } catch {
      onError('Server error creating channel');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 600,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(109,44,44,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#3b2327', fontSize: 20 }}>Manage Channels</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6d2c2c', fontWeight: 700 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid rgba(109,44,44,0.1)', paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              background: activeTab === 'list' ? 'rgba(109,44,44,0.1)' : 'transparent',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#6d2c2c',
              fontSize: 13,
            }}
          >
            Existing Channels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              background: activeTab === 'create' ? 'rgba(109,44,44,0.1)' : 'transparent',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#6d2c2c',
              fontSize: 13,
            }}
          >
            Create Channel
          </button>
        </div>

        {activeTab === 'list' ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {channels.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>No channels found.</p>}
            {channels.map(channel => (
              <div key={channel._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#faf8f9', borderRadius: 8, border: '1px solid rgba(109,44,44,0.08)' }}>
                <div>
                  <strong style={{ color: '#3b2327', fontSize: 14 }}>{channel.name}</strong>
                  <div style={{ color: '#8a6a71', fontSize: 11 }}>Slug: {channel.slug} {channel.isArchived ? '(Archived)' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCreateChannel} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3b2327', marginBottom: 4 }}>Channel Name</label>
              <input
                type="text"
                value={createName}
                onChange={e => {
                  setCreateName(e.target.value);
                  setCreateSlug(slugify(e.target.value));
                }}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(109,44,44,0.2)', fontSize: 13, boxSizing: 'border-box' }}
                placeholder="e.g. Study Group"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3b2327', marginBottom: 4 }}>Channel Slug</label>
              <input
                type="text"
                value={createSlug}
                onChange={e => setCreateSlug(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(109,44,44,0.2)', fontSize: 13, boxSizing: 'border-box' }}
                placeholder="studyGroup"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                style={{ background: '#6d2c2c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Create Channel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// Main FeedPage export update integration below
export default function FeedPage({ feed, canBlast = false }) {
  const { user } = useAuth();
  const { isNarrow, isPhone } = useViewportFlags();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [feedReadAt, setFeedReadAt] = useState(null);
  const [uiMessage, setUiMessage] = useState(null);
  const messageListRef = useRef(null);
  const postRefs = useRef({});
  const feedBottomRef = useRef(null);
  const initialScrollDoneRef = useRef(false);
  const [members, setMembers] = useState([]);
  const [showMembersPanel, setShowMembersPanel] = useState(() => {
    try {
      const saved = localStorage.getItem(`psr-feed-show-members:${feed}`);
      return saved == null ? !window.matchMedia('(max-width: 980px)').matches : saved === 'true';
    } catch {
      return true;
    }
  });
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState(null);
  const [composerState, setComposerState] = useState(null);

  const userId = user?._id || user?.id;
  const currentChannel = channels.find(c => c.slug === feed);
  const isArchived = currentChannel?.isArchived === true;

  const currentProfilesById = useMemo(() => {
    const byId = new Map();
    const sources = [members, approvedUsers, user ? [user] : []];
    sources.flat().forEach(entry => {
      const id = String(entry?._id || entry?.id || '');
      if (!id) return;
      byId.set(id, entry);
    });
    return byId;
  }, [approvedUsers, members, user]);

  const displayPosts = useMemo(() => applyCurrentProfilesToPosts(posts, currentProfilesById), [posts, currentProfilesById]);

  const canPost = feed === 'penguinParties' || feed === 'alumniFeed'
    ? !!user
    : isOfficerLevel(user);

  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  const hasPosition = (key) => Array.isArray(user?.positions) && user.positions.some(p => p?.key === key);
  const isWebTeamUser = roles.includes('webmaster') || roles.includes('webdev') || hasPosition('WEBMASTER') || hasPosition('WEBDEV');
  const isExecUser = roles.includes('exec');
  const canCreateChannels = isExecUser || isWebTeamUser;
  const canOpenManage = canCreateChannels || hasPosition('MEM_ED');

  useEffect(() => {
    socket.on('refresh_data', (data) => {
      if (data.collection === 'members') loadMembers();
      if (data.collection === 'channels') loadChannels();
      if (data.collection === 'roles' || data.collection === 'posts' || data.collection === feed) load();
    });

    return () => {
      socket.off('refresh_data');
    };
  }, [feed, currentChannel?._id, userId]);

  const loadChannels = async () => {
    const headers = userId ? { 'x-user-id': userId } : {};
    const res = await fetch('/api/channels', { headers });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setChannels([]);
      setUiMessage({ type: 'error', text: data.message || 'Unable to load channels.' });
      return;
    }
    const list = Array.isArray(data) ? data : [];
    setChannels(list);
    if (!selectedChannelId && list.length) {
      const found = list.find(c => c.slug === feed);
      setSelectedChannelId(found?._id || list[0]._id);
    }
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const headers = { 'x-user-id': userId || '' };
    const [postsRes, readStateRes] = await Promise.all([
      fetch(`/api/feeds/${feed}/posts`, { headers }),
      fetch(`/api/feeds/${feed}/read-state`, { headers }),
    ]);
    const data = await postsRes.json().catch(() => ([]));
    const readStateData = await readStateRes.json().catch(() => ({}));
    setLoading(false);
    if (!postsRes.ok) {
      setUiMessage({ type: 'error', text: data.message || 'Failed to load posts.' });
      setPosts([]);
      return;
    }
    const ordered = Array.isArray(data)
      ? [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : [];
    setFeedReadAt(readStateRes.ok ? readStateData.lastReadAt || null : null);
    setPosts(ordered);
  };

  const updateBackendReadState = async (timestamp) => {
    if (!userId || !timestamp) return;
    setFeedReadAt(timestamp);
    await fetch(`/api/feeds/${feed}/read-state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ lastReadAt: timestamp }),
    }).catch(() => {});
  };

  const requestDeletePost = (post) => {
    setPendingDeleteTarget({ type: 'post', postId: post._id });
  };

  const confirmDeletePost = async () => {
    if (!pendingDeleteTarget || !userId) return;
    const isComment = pendingDeleteTarget.type === 'comment';
    const isReply = pendingDeleteTarget.type === 'reply';
    const endpoint = isReply
      ? `/api/feeds/posts/${pendingDeleteTarget.postId}/comments/${pendingDeleteTarget.commentId}/replies/${pendingDeleteTarget.replyId}`
      : isComment
        ? `/api/feeds/posts/${pendingDeleteTarget.postId}/comments/${pendingDeleteTarget.commentId}`
        : `/api/feeds/posts/${pendingDeleteTarget.postId}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUiMessage({ type: 'error', text: data.message || 'Unable to delete item.' });
      return;
    }
    setPendingDeleteTarget(null);
    setUiMessage(null);
    await load();
  };

  const loadMembers = async () => {
    if (!currentChannel?._id || !userId) return;
    const res = await fetch(`/api/channels/${currentChannel._id}/members`, {
      headers: { 'x-user-id': userId },
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setMembers([]);
      return;
    }
    setMembers(Array.isArray(data) ? data : []);
  };

  const loadApprovedUsers = async () => {
    if (!userId) return;
    const res = await fetch('/api/users/approved', { headers: { 'x-user-id': userId } });
    const data = await res.json().catch(() => []);
    setApprovedUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadChannels();
  }, [feed, userId]);

  useEffect(() => {
    if (userId) loadApprovedUsers();
  }, [userId]);

  useEffect(() => {
    if (currentChannel?._id && userId) loadMembers();
  }, [currentChannel?._id, userId, feed]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ height: isNarrow ? 'auto' : 'calc(100vh - 84px)', minHeight: 0, maxHeight: isNarrow ? 'none' : 'calc(100vh - 84px)', overflow: isNarrow ? 'visible' : 'hidden', paddingBottom: isNarrow ? 8 : 12, boxSizing: 'border-box', width: '100%' }}>
      <motion.div layout style={{ background: 'linear-gradient(180deg, rgba(255,250,252,0.985), rgba(248,232,238,0.98))', border: '1px solid rgba(109,44,44,0.12)', borderRadius: isPhone ? 12 : 22, overflow: 'hidden', height: isNarrow ? 'auto' : '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }}>
        
        <motion.div layout style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', justifyContent: 'space-between', alignItems: isPhone ? 'stretch' : 'center', gap: 8, padding: isPhone ? '10px 12px' : '12px 18px 10px', borderBottom: '1px solid rgba(109,44,44,0.09)', background: 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(243,222,232,0.58))', position: 'sticky', top: 0, zIndex: 2, boxSizing: 'border-box', width: '100%' }}>
          <div>
            <div style={{ color: '#6d2c2c', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1, fontWeight: 700 }}>📌 Pinned channel</div>
            <h1 style={{ margin: 0, fontSize: isPhone ? 18 : 22, color: '#3b2327' }}>{FEED_TITLES[feed] || currentChannel?.name || 'Feed'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isPhone ? '100%' : 'auto' }}>
            {currentChannel?._id && (
              <motion.button whileHover={{ y: -1, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING_TRANSITION} onClick={() => setShowMembersPanel(prev => !prev)} style={{ border: '1px solid rgba(109,44,44,0.12)', background: 'rgba(255,255,255,0.74)', color: '#5a3034', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: isPhone ? 1 : 'initial' }}>
                {showMembersPanel ? 'Hide members' : 'Show members'}
              </motion.button>
            )}
            {canOpenManage && (
              <motion.button 
                whileHover={{ y: -1, scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                transition={SPRING_TRANSITION} 
                onClick={() => setManageOpen(true)} 
                style={{ border: '1px solid rgba(109,44,44,0.12)', background: 'rgba(255,255,255,0.74)', color: '#5a3034', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: isPhone ? 1 : 'initial' }}
              >
                Manage Channels
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Existing Content Feed and Chat Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: showMembersPanel && !isNarrow ? 'minmax(0,1fr) 220px' : 'minmax(0,1fr)', flex: 1, minHeight: 0, background: '#fbf2f6', overflow: 'hidden', boxSizing: 'border-box', width: '100%' }}>
          <div ref={messageListRef} style={{ padding: isPhone ? '6px 2px 0' : '10px 0 0', overflowY: isNarrow ? 'visible' : 'auto', minHeight: 0, background: 'linear-gradient(180deg, rgba(251,242,246,0.94), rgba(249,238,243,0.96))', boxSizing: 'border-box' }}>
            {loading && <div style={{ color: '#5a3034', padding: '14px 16px', fontSize: 13 }}>Loading…</div>}
            {!loading && displayPosts.length === 0 && <div style={{ color: '#5a3034', padding: '14px 16px', fontSize: 13 }}>No posts yet.</div>}
            {!loading && displayPosts.map((p) => (
              <div key={p._id} style={{ padding: '0 4px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ padding: 10, borderBottom: '1px solid rgba(109,44,44,0.06)' }}>
                  <strong>{p.authorName}</strong>: {p.content}
                </div>
              </div>
            ))}
            <div ref={feedBottomRef} />
          </div>
        </div>
      </motion.div>

      {/* Render the Manage Channels Modal popup when manageOpen is true */}
      <ManageChannelsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        channels={channels}
        onRefresh={loadChannels}
        onError={msg => setUiMessage({ type: 'error', text: msg })}
        userId={userId}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteTarget)}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        onConfirm={confirmDeletePost}
        onCancel={() => setPendingDeleteTarget(null)}
      />
    </motion.div>
  );
}