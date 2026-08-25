import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

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

function HoverActionButton({ label, icon, onClick, active = false, danger = false, popover = null, children }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        overflow: 'visible',
      }}
    >
      <motion.button
        type="button"
        whileHover={{ y: -2, scale: 1.025 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING_TRANSITION}
        onClick={onClick}
        style={{
          background: danger
            ? 'rgba(255, 243, 246, 0.96)'
            : active
              ? 'linear-gradient(135deg, rgba(255, 247, 250, 0.98), rgba(249, 232, 238, 0.96))'
              : 'rgba(255,255,255,0.86)',
          color: danger ? '#7f1d1d' : '#6d2c2c',
          borderRadius: 9,
          padding: '0 8px',
          height: 28,
          fontSize: 11,
          cursor: 'pointer',
          lineHeight: 1.1,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          minWidth: 64,
          letterSpacing: '0',
          border: `1px solid ${danger ? 'rgba(178,34,34,0.12)' : active ? 'rgba(236,144,184,0.24)' : 'rgba(109,44,44,0.08)'}`,
          boxShadow: active ? '0 6px 12px rgba(236,144,184,0.12)' : '0 2px 6px rgba(109,44,44,0.03)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {icon ? <ActionIcon name={icon} size={12} /> : null}
        <span>{label}</span>
        {children}
      </motion.button>

      {popover ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 24,
          }}
        >
          {popover}
        </div>
      ) : null}
    </div>
  );
}

function HoverActionBar({ children, top = -10, right = 6 }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        display: 'inline-flex',
        gap: 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 34,
        padding: '3px',
        borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(253,246,249,0.94))',
        backdropFilter: 'blur(18px) saturate(140%)',
        border: '1px solid rgba(109,44,44,0.1)',
        boxShadow: '0 8px 18px rgba(109,44,44,0.07)',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflow: 'visible',
        zIndex: 4,
        maxWidth: '100%',
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  );
}

function getPostMedia(post) {
  const explicit = Array.isArray(post?.attachments) ? post.attachments : [];
  if (explicit.length) {
    return explicit.filter(Boolean).map((item, index) => ({
      id: item.id || `${post._id || 'post'}-${index}`,
      name: item.name || 'Attachment',
      url: item.url || item.src || '',
      type: item.type || 'file',
    }));
  }

  const fallback = [];
  if (post?.imageURL) {
    const url = String(post.imageURL || '');
    const type = url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image';
    fallback.push({ id: `${post._id || 'post'}-image`, name: 'Media', url, type });
  }
  return fallback;
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26, 12, 15, 0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1200 }}>
      <div style={{ width: 'min(100%, 480px)', borderRadius: 22, background: 'linear-gradient(180deg, #2f1d20, #24171a)', color: '#fff7fa', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 20px 50px rgba(24,10,13,0.34)', padding: '20px 22px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#f8d9df' }}>{title}</div>
        <div style={{ fontSize: 15, lineHeight: 1.4, color: '#fff3f6' }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onCancel} style={{ border: 'none', borderRadius: 999, background: 'rgba(148,55,60,0.9)', color: '#fff6f8', fontWeight: 700, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} style={{ border: '2px solid rgba(68,36,42,0.9)', borderRadius: 999, background: '#f2aab5', color: '#4a2328', fontWeight: 800, padding: '9px 22px', cursor: 'pointer', fontSize: 13, boxShadow: 'inset 0 0 0 1px rgba(255,236,240,0.78)' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildReactionState(items) {
  const result = {};
  (Array.isArray(items) ? items : []).forEach(item => {
    if (!item?.emoji) return;
    result[item.emoji] = Number(item.count || 0);
  });
  return result;
}

function CommentThreadItem({
  item,
  post,
  commentId,
  currentUserId,
  onReplyRequest,
  onEditRequest,
  onDeleteRequest,
  isReply = false,
  isCompact = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [userReactions, setUserReactions] = useState({});
  const [reactions, setReactions] = useState(() => buildReactionState(item?.reactions));
  const reactionOptions = ['👍', '❤️', '😂', '🔥'];
  const reactionSummary = reactionOptions.filter(emoji => (reactions[emoji] || 0) > 0);
  const entryName = item?.name || 'Member';
  const entryAvatar = getUserAvatarUrl(item?.user || item?.author) || item?.avatarUrl;
  const entryTime = formatMessageTime(item?.createdAt);
  const isCurrentUserEntry = Boolean(currentUserId && String(item?.userId || '') === String(currentUserId));
  const actionRowVisible = isCompact ? actionsOpen : isHovered;

  const triggerReaction = (emoji) => {
    const alreadyReacted = Boolean(userReactions[emoji]);
    setReactions(prev => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (alreadyReacted ? -1 : 1)),
    }));
    setUserReactions(prev => ({ ...prev, [emoji]: !alreadyReacted }));
    setShowReactions(false);
  };

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => { setIsHovered(false); setShowReactions(false); if (!isCompact) setActionsOpen(false); }} style={{ display: 'flex', gap: isCompact ? 5 : 7, alignItems: 'flex-start', marginTop: isReply ? 6 : 0, marginLeft: isReply ? (isCompact ? 6 : 18) : 0, width: '100%', boxSizing: 'border-box' }}>
      <ChatAvatar src={entryAvatar} name={entryName} size={isReply ? 22 : 26} fontSize={isReply ? 8 : 9} />
      <div onClick={() => { if (isCompact) setActionsOpen(prev => !prev); }} style={{ flex: 1, minWidth: 0, background: isReply ? 'rgba(255,255,255,0.76)' : '#faf8f9', border: '1px solid rgba(109,44,44,0.08)', borderRadius: 11, padding: isCompact ? '6px 8px' : '7px 9px', boxShadow: '0 4px 12px rgba(109,44,44,0.04)', position: 'relative', cursor: isCompact ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', paddingRight: actionRowVisible && !isCompact ? 100 : 0 }}>
          <strong style={{ color: '#6d2c2c', fontSize: isReply ? 11 : 12 }}>{entryName}</strong>
          <span style={{ color: '#8a6a71', fontSize: 10 }}>{entryTime}</span>
        </div>
        {actionRowVisible && (
          <HoverActionBar top={isCompact ? -8 : 6} right={isCompact ? 0 : 8}>
            <HoverActionButton
              label="React"
              icon="react"
              onClick={() => setShowReactions(prev => !prev)}
              active={showReactions}
              popover={showReactions ? (
                <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(109,44,44,0.12)', borderRadius: 12, padding: 6, boxShadow: '0 12px 24px rgba(109,44,44,0.12)', backdropFilter: 'blur(18px)' }}>
                  {reactionOptions.map(emoji => (
                    <button key={emoji} type="button" onClick={() => triggerReaction(emoji)} style={{ border: '1px solid rgba(109,44,44,0.08)', background: 'rgba(236,144,184,0.08)', color: '#6d2c2c', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 13 }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            />
            <HoverActionButton label="Reply" icon="reply" onClick={() => onReplyRequest && onReplyRequest(post, commentId, item, isReply)} />
            {isCurrentUserEntry && (
              <>
                <HoverActionButton label="Edit" icon="edit" onClick={() => onEditRequest && onEditRequest(post, commentId, item, isReply)} />
                <HoverActionButton label="Delete" icon="delete" danger onClick={() => onDeleteRequest && onDeleteRequest(post, commentId, item, isReply)} />
              </>
            )}
          </HoverActionBar>
        )}
        <div style={{ color: '#3b2327', marginTop: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, fontSize: isCompact ? 12 : 13 }}>
          {item?.replyToName ? <span style={{ color: '#8f5864', fontWeight: 700 }}>{`@${item.replyToName} `}</span> : null}
          {item?.text}
        </div>
        {reactionSummary.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
            {reactionSummary.map(emoji => (
              <button key={emoji} type="button" onClick={() => triggerReaction(emoji)} style={{ border: '1px solid rgba(109,44,44,0.08)', background: 'rgba(255,255,255,0.7)', color: userReactions[emoji] ? '#6d2c2c' : '#5a3034', borderRadius: 999, padding: '1px 6px', fontSize: 10, cursor: 'pointer', fontWeight: userReactions[emoji] ? 700 : 600 }}>
                {emoji} {reactions[emoji] || 0}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePost({ feed, canPost, canBlast, onPosted, postingLocked, composerState, onClearComposerState, onError, isCompact = false, isPhone = false }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sendAsText, setSendAsText] = useState(false);
  const [audienceType, setAudienceType] = useState('channel');
  const [includeRoles, setIncludeRoles] = useState([]);
  const [includeMemberStatuses, setIncludeMemberStatuses] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [draftAttachments, setDraftAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUserAvatar = getCurrentUserAvatar(user);
  const canSendSms = Array.isArray(user?.positions)
    ? user.positions.some(p => SMS_ALLOWED_POSITION_KEYS.includes(p?.key))
    : false;

  useEffect(() => {
    return () => {
      draftAttachments.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      });
    };
  }, [draftAttachments]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users/approved', {
          credentials: 'include',
          headers: user?._id || user?.id ? { 'x-user-id': user._id || user.id } : undefined,
        });
        const data = await res.json();
        if (Array.isArray(data)) setUserOptions(data);
      } catch {
        setUserOptions([]);
      }
    };
    if (sendAsText && audienceType === 'specific') {
      loadUsers();
    }
  }, [sendAsText, audienceType, user]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [content]);

  useEffect(() => {
    if (!composerState) return;
    setContent(['edit', 'editComment', 'editReply'].includes(composerState.type) ? composerState.initialText || '' : '');
    setShowEmojiPicker(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [composerState]);

  const applyEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => `${prev}${emoji}`);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const updated = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    setContent(updated);
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + emoji.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleFileChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (!nextFiles.length) return;
    const created = nextFiles.map(file => {
      const type = file.type || '';
      const kind = type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : 'file';
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        type,
        kind,
        file,
        preview: kind === 'file' ? '' : URL.createObjectURL(file),
      };
    });
    setDraftAttachments(prev => [...prev, ...created]);
    event.target.value = '';
  };

  const removeAttachment = (id) => {
    setDraftAttachments(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return prev.filter(item => item.id !== id);
    });
  };

  const clearDraftAttachments = () => {
    setDraftAttachments(prev => {
      prev.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      });
      return [];
    });
  };

  const resetComposer = () => {
    setContent('');
    setSendAsText(false);
    setAudienceType('channel');
    setIncludeRoles([]);
    setIncludeMemberStatuses([]);
    setSelectedUserIds([]);
    clearDraftAttachments();
    setShowEmojiPicker(false);
    onClearComposerState && onClearComposerState();
  };

  const submit = async () => {
    const trimmed = content.trim();
    if ((!trimmed && draftAttachments.length === 0) || !user) return;
    if (postingLocked) return;
    if (sendAsText && audienceType === 'specific' && selectedUserIds.length === 0) return;

    setSubmitting(true);
    const userId = user?._id || user?.id;

    if (composerState?.type === 'edit') {
      const res = await fetch(`/api/feeds/posts/${composerState.postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        onError && onError(data.message || 'Unable to edit message');
        return;
      }
      resetComposer();
      onPosted && onPosted();
      return;
    }

    if (composerState?.type === 'editComment') {
      const res = await fetch(`/api/feeds/posts/${composerState.postId}/comments/${composerState.commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        onError && onError(data.message || 'Unable to edit reply');
        return;
      }
      resetComposer();
      onPosted && onPosted();
      return;
    }

    if (composerState?.type === 'reply') {
      const res = await fetch(`/api/feeds/posts/${composerState.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        onError && onError(data.message || 'Unable to reply to message');
        return;
      }
      resetComposer();
      onPosted && onPosted();
      return;
    }

    if (composerState?.type === 'replyComment') {
      const res = await fetch(`/api/feeds/posts/${composerState.postId}/comments/${composerState.commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          text: trimmed,
          replyToId: composerState.replyToId || '',
          replyToName: composerState.replyToName || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        onError && onError(data.message || 'Unable to reply');
        return;
      }
      resetComposer();
      onPosted && onPosted();
      return;
    }

    if (composerState?.type === 'editReply') {
      const res = await fetch(`/api/feeds/posts/${composerState.postId}/comments/${composerState.commentId}/replies/${composerState.replyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        onError && onError(data.message || 'Unable to edit reply');
        return;
      }
      resetComposer();
      onPosted && onPosted();
      return;
    }

    const formData = new FormData();
    formData.append('content', trimmed);
    formData.append('sendAsText', String(canSendSms ? sendAsText : false));

    if (canSendSms && sendAsText) {
      formData.append('audienceType', audienceType);
      formData.append('channelSlug', feed);
      formData.append('includeRoles', JSON.stringify(includeRoles));
      formData.append('includeMemberStatuses', JSON.stringify(includeMemberStatuses));
      formData.append('selectedUserIds', JSON.stringify(selectedUserIds));
    }

    draftAttachments.forEach(item => {
      if (item.file) formData.append('attachments', item.file);
    });

    const res = await fetch(`/api/feeds/${feed}/posts`, {
      method: 'POST',
      headers: {
        'x-user-id': userId || '',
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      onError && onError(data.message || 'Server error creating post');
      return;
    }

    resetComposer();
    onPosted && onPosted();
  };

  if (!canPost) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} style={{ background: '#fbf2f6', border: '1px solid rgba(109,44,44,0.1)', borderRadius: isPhone ? 14 : 20, padding: isPhone ? '8px 10px' : 10, margin: '0 auto', maxWidth: 760, boxShadow: '0 10px 24px rgba(109,44,44,0.06)', boxSizing: 'border-box' }}>
      {composerState && (
        <div style={{ display: 'flex', flexDirection: isCompact ? 'column' : 'row', alignItems: isCompact ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(251,242,246,0.96)', border: '1px solid rgba(109,44,44,0.1)', color: '#6d2c2c' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{composerState.type === 'edit' ? 'Editing message' : 'Replying to message'}</div>
            style={{
                    height: 'auto',
                    minHeight: 0,
                    maxHeight: 'none',
                    overflow: 'visible',
                    padding: isPhone ? '0 8px 8px' : '0 0 12px',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
          </div>
          <button type="button" onClick={resetComposer} style={{ border: 'none', background: 'transparent', color: '#6d2c2c', cursor: 'pointer', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        </div>
      )}

      {draftAttachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {draftAttachments.map(item => (
            <div key={item.id} style={{ position: 'relative', minWidth: isPhone ? '100%' : 84, maxWidth: isPhone ? '100%' : 140, height: 50, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(109,44,44,0.12)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', boxSizing: 'border-box' }}>
              {item.kind === 'image' && item.preview ? <img src={item.preview} alt={item.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} /> : null}
              {item.kind === 'video' && item.preview ? <video src={item.preview} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} muted playsInline /> : null}
              {item.kind === 'file' ? (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,144,184,0.14)', color: '#6d2c2c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  FILE
                </div>
              ) : null}
              <div style={{ minWidth: 0, paddingRight: 12, flex: 1 }}>
                <div style={{ color: '#4f2f32', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ color: '#8a6a71', fontSize: 10 }}>{item.kind === 'file' ? 'Ready' : item.kind}</div>
              </div>
              <button type="button" onClick={() => removeAttachment(item.id)} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(109,44,44,0.82)', color: '#fff', cursor: 'pointer', lineHeight: 1, fontSize: 11 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(109,44,44,0.12)', borderRadius: 16, padding: '8px 10px', background: 'rgba(255,255,255,0.82)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#faf8f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d2c2c', fontSize: 12, fontWeight: 700, boxShadow: '0 6px 14px rgba(109,44,44,0.06)', flexShrink: 0, border: '1px solid rgba(109,44,44,0.1)', marginTop: 3 }}>
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt="Your profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerText = getInitials(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || 'You'); }} />
            ) : (
              getInitials(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || 'You')
            )}
          </div>

          <textarea
            ref={textareaRef}
            placeholder="Message the channel..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={1}
            disabled={postingLocked}
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              padding: '4px 0',
              background: 'transparent',
              color: '#2f1f22',
              fontSize: 14,
              lineHeight: 1.4,
              outline: 'none',
              boxSizing: 'border-box',
              minHeight: 30,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5, flexWrap: 'wrap', width: '100%', borderTop: '1px solid rgba(109,44,44,0.06)', paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_TRANSITION}
              onClick={() => fileInputRef.current?.click()}
              disabled={postingLocked}
              style={{
                border: 'none',
                background: 'rgba(250,248,249,0.9)',
                color: '#6d2c2c',
                borderRadius: 999,
                width: 30,
                height: 30,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(109,44,44,0.06)',
              }}
              aria-label="Upload attachment"
            >
              <ActionIcon name="plus" size={13} />
            </motion.button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.csv" onChange={handleFileChange} style={{ display: 'none' }} />

            <motion.button
              type="button"
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_TRANSITION}
              onClick={() => setShowEmojiPicker(prev => !prev)}
              style={{
                border: 'none',
                background: showEmojiPicker ? 'rgba(236,144,184,0.14)' : 'rgba(250,248,249,0.9)',
                color: '#6d2c2c',
                borderRadius: 999,
                width: 30,
                height: 30,
                cursor: 'pointer',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: showEmojiPicker ? '0 4px 14px rgba(236,144,184,0.16)' : '0 4px 12px rgba(109,44,44,0.06)',
                fontSize: 13,
              }}
              aria-label="Add emoji"
            >
              😊
            </motion.button>
          </div>

          <motion.button 
            type="button" 
            whileHover={{ scale: 1.04, y: -1 }} 
            whileTap={{ scale: 0.97 }} 
            transition={SPRING_TRANSITION} 
            onClick={submit} 
            disabled={postingLocked || submitting || (!content.trim() && draftAttachments.length === 0)} 
            style={{ 
              border: 'none', 
              background: 'linear-gradient(135deg,#6d2c2c,#ec90b8)', 
              color: '#fff', 
              fontWeight: 700, 
              borderRadius: 999, 
              padding: '0 14px', 
              height: 30, 
              minWidth: 70, 
              cursor: 'pointer', 
              opacity: postingLocked || submitting || (!content.trim() && draftAttachments.length === 0) ? 0.5 : 1, 
              boxShadow: '0 8px 18px rgba(109,44,44,0.18)',
              fontSize: 12,
            }}
          >
            {submitting ? '...' : ['edit', 'editComment', 'editReply'].includes(composerState?.type) ? 'Save' : ['reply', 'replyComment'].includes(composerState?.type) ? 'Reply' : 'Send'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              flexWrap: 'wrap',
              padding: '6px 2px 0',
              justifyContent: 'flex-end',
            }}
          >
            {EMOJI_OPTIONS.map(emoji => (
              <motion.button
                key={emoji}
                type="button"
                whileHover={{ y: -2, scale: 1.1 }}
                whileTap={{ scale: 0.96 }}
                transition={SPRING_TRANSITION}
                onClick={() => applyEmoji(emoji)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.82)',
                  color: '#4f2f32',
                  borderRadius: 999,
                  width: 26,
                  height: 26,
                  cursor: 'pointer',
                  fontSize: 13,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 12px rgba(109,44,44,0.06)',
                }}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!composerState && canSendSms && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5, color: '#7b5d63', padding: '0 2px', boxSizing: 'border-box' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6d2c2c', fontWeight: 600 }}>
            <input type="checkbox" checked={sendAsText} onChange={e => setSendAsText(e.target.checked)} /> Also send as text blast
          </label>
          {sendAsText && (
            <select value={audienceType} onChange={e => setAudienceType(e.target.value)} style={{ borderRadius: 999, border: '1px solid rgba(109,44,44,0.14)', background: 'rgba(255,255,255,0.8)', color: '#4f2f32', padding: '4px 8px', minHeight: 30, fontSize: 11, width: '100%', boxSizing: 'border-box' }}>
              <option value="channel">All Sisters (Channel Members)</option>
              <option value="roleStatus">By Role/Status</option>
              <option value="specific">Specific Users</option>
            </select>
          )}
        </div>
      )}

      {sendAsText && audienceType === 'roleStatus' && (
        <div style={{ marginTop: 6, border: '1px solid rgba(109,44,44,0.1)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.68)', maxHeight: 150, overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 11, marginBottom: 5, color: '#4f2f32', fontWeight: 700 }}>Roles</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 5 }}>
            {ROLE_OPTIONS.map(r => (
              <label key={r} style={{ fontSize: 10, color: '#6d2c2c', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <input type="checkbox" checked={includeRoles.includes(r)} onChange={e => { if (e.target.checked) setIncludeRoles(prev => [...prev, r]); else setIncludeRoles(prev => prev.filter(x => x !== r)); }} />{' '}{r}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11, marginTop: 8, marginBottom: 5, color: '#4f2f32', fontWeight: 700 }}>Member Statuses</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 5 }}>
            {MEMBER_STATUS_OPTIONS.map(s => (
              <label key={s} style={{ fontSize: 10, color: '#6d2c2c', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <input type="checkbox" checked={includeMemberStatuses.includes(s)} onChange={e => { if (e.target.checked) setIncludeMemberStatuses(prev => [...prev, s]); else setIncludeMemberStatuses(prev => prev.filter(x => x !== s)); }} />{' '}{s}
              </label>
            ))}
          </div>
        </div>
      )}

      {sendAsText && audienceType === 'specific' && (
        <div style={{ marginTop: 6, border: '1px solid rgba(109,44,44,0.1)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.68)', maxHeight: 150, overflowY: 'auto', boxSizing: 'border-box' }}>
          {userOptions.length === 0 && <div style={{ fontSize: 11, color: '#7b5d63' }}>No users available.</div>}
          {userOptions.map(u => (
            <label key={u._id} style={{ display: 'block', fontSize: 11, color: '#4f2f32', padding: '3px 0' }}>
              <input type="checkbox" checked={selectedUserIds.includes(u._id)} onChange={e => { if (e.target.checked) setSelectedUserIds(prev => [...prev, u._id]); else setSelectedUserIds(prev => prev.filter(id => id !== u._id)); }} />{' '}
              {u.firstName} {u.lastName}{u.role ? ` (${Array.isArray(u.role) ? u.role.join(', ') : u.role})` : ''}
            </label>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PostCard({ post, onDeleteRequest, onReplyRequest, onEditRequest, onThreadReplyRequest, onEditCommentRequest, onDeleteCommentRequest, isGrouped = false, isCompact = false }) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [messageActionsOpen, setMessageActionsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userReactions, setUserReactions] = useState({});
  const [reactions, setReactions] = useState({
    '👍': post?.reactions?.['👍'] || 0,
    '🎉': post?.reactions?.['🎉'] || 0,
    '❤️': post?.reactions?.['❤️'] || 0,
    '🔥': post?.reactions?.['🔥'] || 0,
  });
  const isCurrentUserPost = Boolean(
    user && (
      String(post?.authorId || '') === String(user?._id || user?.id || '') ||
      String(post?.authorId || '') === String(user?.id || '') ||
      String(post?.authorId || '') === String(user?._id || '')
    )
  );

  const authorName = post.authorName || 'Team Member';
  const authorProfile = post.author || post.user || {};
  const avatarUrl = getUserAvatarUrl(authorProfile) || post.authorAvatar || post.profilePicUrl || getCurrentUserAvatar(authorProfile);
  const media = getPostMedia(post);
  const reactionOptions = ['👍', '🎉', '❤️', '🔥'];
  const reactionSummary = reactionOptions.filter(emoji => (reactions[emoji] || 0) > 0);

  const when = formatMessageTime(post.createdAt);
  const authorDisplayColor = isCurrentUserPost ? '#6d2c2c' : '#4f2f32';

  const triggerReaction = (emoji) => {
    const alreadyReacted = Boolean(userReactions[emoji]);
    setReactions(prev => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (alreadyReacted ? -1 : 1)),
    }));
    setUserReactions(prev => ({ ...prev, [emoji]: !alreadyReacted }));
    setShowReactions(false);
  };

  const actionRowVisible = isCompact ? messageActionsOpen : isHovered || messageActionsOpen;
  const compactGroupedMessage = isGrouped;
  const bubbleStyle = {
    background: '#faf8f9',
    border: '1px solid rgba(109,44,44,0.08)',
    borderRadius: compactGroupedMessage ? 12 : 16,
    padding: compactGroupedMessage ? '8px 10px' : '10px 12px',
    color: '#3b2327',
    boxShadow: 'none',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 0,
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => { setIsHovered(false); setShowReactions(false); if (isCompact) setMessageActionsOpen(false); }} style={{ display: 'flex', gap: isCompact ? 6 : 10, alignItems: 'flex-start', padding: isGrouped ? (isCompact ? '0 2px 4px' : '0 8px 6px') : (isCompact ? '0 2px 8px' : '0 8px 10px'), borderBottom: 'none', marginBottom: 0, justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', minWidth: 0, display: 'flex', gap: isCompact ? 6 : 10, alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
        {!isGrouped ? (
          <ChatAvatar src={avatarUrl} name={authorName} size={isCompact ? 30 : 36} fontSize={isCompact ? 10 : 12} style={{ boxShadow: '0 6px 12px rgba(109,44,44,0.05)' }} />
        ) : <div style={{ width: isCompact ? 30 : 36, flexShrink: 0 }} />}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, position: 'relative', boxSizing: 'border-box' }}>
          {!isGrouped && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap', justifyContent: 'flex-start', width: '100%' }}>
              <strong style={{ color: authorDisplayColor, fontSize: 13, fontWeight: 700 }}>{authorName}</strong>
              {post.authorRole?.length > 0 && <span style={{ color: '#8a6a71', fontSize: 10 }}>{post.authorRole.join(', ')}</span>}
              <span style={{ color: '#7b5d63', fontSize: 10 }}>{when}</span>
            </div>
          )}

        {actionRowVisible && (
          <div onClick={e => e.stopPropagation()}>
          <HoverActionBar top={isGrouped ? 2 : 16}>
            <HoverActionButton
              label="React"
              icon="react"
              onClick={() => setShowReactions(prev => !prev)}
              active={showReactions}
              popover={showReactions ? (
                <div style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(109,44,44,0.12)', borderRadius: 12, boxShadow: '0 12px 24px rgba(109,44,44,0.12)', padding: 6, display: 'flex', gap: 5, backdropFilter: 'blur(18px)' }}>
                  {reactionOptions.map(emoji => (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ y: -2, scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING_TRANSITION}
                      onClick={() => triggerReaction(emoji)}
                      style={{ border: '1px solid rgba(109,44,44,0.08)', background: 'rgba(236,144,184,0.08)', borderRadius: 8, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, color: '#6d2c2c' }}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              ) : null}
            />
            
            <HoverActionButton 
              label="Reply" 
              icon="reply" 
              onClick={() => { onReplyRequest && onReplyRequest(post); setMessageActionsOpen(false); }} 
            />
            
            {isCurrentUserPost && (
              <HoverActionButton 
                label="Edit" 
                icon="edit" 
                onClick={() => { onEditRequest && onEditRequest(post); setMessageActionsOpen(false); }} 
              />
            )}
            
            {isCurrentUserPost && (
              <HoverActionButton 
                label="Delete" 
                icon="delete" 
                danger 
                onClick={() => onDeleteRequest && onDeleteRequest(post)} 
              />
            )}
          </HoverActionBar>
          </div>
        )}

        <div onClick={() => setMessageActionsOpen(prev => !prev)} style={{ ...bubbleStyle, cursor: 'pointer', padding: compactGroupedMessage ? (isCompact ? '6px 8px' : bubbleStyle.padding) : (isCompact ? '8px 10px' : bubbleStyle.padding) }}>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: compactGroupedMessage ? 1.3 : 1.45, fontSize: isCompact ? 13 : 14 }}>{post.content}</div>

          {media.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {media.map(item => {
                if (!item.url) return null;
                if (item.type === 'video' || /\.(mp4|webm|ogg|mov)$/i.test(item.url) || item.url.includes('video')) {
                  return <video key={item.id} src={item.url} controls style={{ width: '100%', maxHeight: isCompact ? 180 : 240, borderRadius: 8, background: '#0f172a' }} />;
                }
                return <img key={item.id} src={item.url} alt={item.name || 'Attached content'} style={{ width: '100%', maxHeight: isCompact ? 200 : 260, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(148,163,184,0.18)' }} />;
              })}
            </div>
          )}

          {post.sendTextBlast && <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 6 }}>📢 Sent as text</div>}
          {post.smsResult && (
            <div style={{ fontSize: 10, color: post.smsResult.failed > 0 ? '#fca5a5' : '#bdc7ff', marginTop: 5 }}>
              {post.smsResult.error
                ? 'SMS skipped: Not authorized'
                : (post.smsResult.sent != null
                  ? `Sent as text to ${post.smsResult.sent || 0} recipient${(post.smsResult.sent || 0) === 1 ? '' : 's'}`
                  : 'SMS failed')}
            </div>
          )}
        </div>

        {reactionSummary.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5, marginLeft: 2, alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
            {reactionSummary.map(emoji => (
              <motion.button
                key={emoji}
                type="button"
                whileHover={{ y: -2, scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING_TRANSITION}
                onClick={() => triggerReaction(emoji)}
                style={{ border: '1px solid rgba(109,44,44,0.08)', background: 'rgba(255,255,255,0.7)', color: emoji === '❤️' ? '#6d2c2c' : userReactions[emoji] ? '#6d2c2c' : '#5a3034', borderRadius: 999, padding: '1px 6px', fontSize: 10, cursor: 'pointer', lineHeight: 1.1, fontWeight: userReactions[emoji] ? 700 : 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                {emoji} {reactions[emoji] || 0}
              </motion.button>
            ))}
          </div>
        )}

        {post.comments?.length > 0 && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6, paddingLeft: isCompact ? 0 : 3, width: '100%', boxSizing: 'border-box' }}>
            {post.comments.map(comment => (
              <div key={comment._id || `${comment.name}-${comment.createdAt}-${comment.text}`} style={{ width: '100%', boxSizing: 'border-box' }}>
                <CommentThreadItem
                  item={comment}
                  post={post}
                  commentId={comment._id}
                  currentUserId={user?._id || user?.id}
                  onReplyRequest={onThreadReplyRequest}
                  onEditRequest={onEditCommentRequest}
                  onDeleteRequest={onDeleteCommentRequest}
                  isCompact={isCompact}
                />
                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                  <div style={{ marginTop: 5, display: 'grid', gap: 5, width: '100%', boxSizing: 'border-box' }}>
                    {comment.replies.map(reply => (
                      <CommentThreadItem
                        key={reply._id || `${reply.name}-${reply.createdAt}-${reply.text}`}
                        item={reply}
                        post={post}
                        commentId={comment._id}
                        currentUserId={user?._id || user?.id}
                        onReplyRequest={onThreadReplyRequest}
                        onEditRequest={onEditCommentRequest}
                        onDeleteRequest={onDeleteCommentRequest}
                        isReply
                        isCompact={isCompact}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
      </div>
    </motion.div>
  );
}

export default function FeedPage({ feed }) {
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
  const [selectedManualUserId, setSelectedManualUserId] = useState('');
  const [selectedExcludedUserId, setSelectedExcludedUserId] = useState('');
  const [selectedChannelMembers, setSelectedChannelMembers] = useState([]);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState(null);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugManualEdit, setSlugManualEdit] = useState(false);
  const [ruleRoles, setRuleRoles] = useState([]);
  const [ruleStatuses, setRuleStatuses] = useState([]);
  const [manageMsg, setManageMsg] = useState('');
  const [composerState, setComposerState] = useState(null);

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

  const canBlast = user?.permissions?.includes('sms.send') === true;
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  const hasPosition = (key) => Array.isArray(user?.positions) && user.positions.some(p => p?.key === key);
  const isWebTeamUser = roles.includes('webmaster') || roles.includes('webdev') || hasPosition('WEBMASTER') || hasPosition('WEBDEV');
  const isExecUser = roles.includes('exec');
  const canCreateChannels = isExecUser || isWebTeamUser;
  const canOverrideSlug = isWebTeamUser;
  const canOpenManage = canCreateChannels || hasPosition('MEM_ED');
  const userId = user?._id || user?.id;
  const currentChannel = channels.find(c => c.slug === feed);
  const isArchived = currentChannel?.isArchived === true;

  const canArchiveChannel = (c) => {
    const isCreatorExec = isExecUser && String(c.createdByUserId || '') === String(userId || '');
    const isMemEdCandidateChannel = Array.isArray(user?.positions) && user.positions.some(p => p?.key === 'MEM_ED') && String(c.slug || '').startsWith('candidates-');
    return isWebTeamUser || isCreatorExec || isMemEdCandidateChannel;
  };
  const isExecCreator = (c) => isExecUser && String(c.createdByUserId || '') === String(userId || '');
  const channelHasPosts = (c) => Number(c?.postCount || 0) > 0 || c?.hasPosts === true;
  const canDeleteChannel = (c) => {
    if (isWebTeamUser) return true;
    if (isExecCreator(c)) return !channelHasPosts(c);
    return false;
  };
  const canManageMembersChannel = (c) => {
    const isMemEdCandidateChannel = Array.isArray(user?.positions) && user.positions.some(p => p?.key === 'MEM_ED') && String(c.slug || '').startsWith('candidates-');
    return isWebTeamUser || isExecUser || isMemEdCandidateChannel;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`psr-feed-show-members:${feed}`);
      setShowMembersPanel(saved == null ? !isNarrow : saved === 'true');
    } catch {
      setShowMembersPanel(!isNarrow);
    }
  }, [feed, isNarrow]);

  useEffect(() => {
    try {
      localStorage.setItem(`psr-feed-show-members:${feed}`, String(showMembersPanel));
    } catch {}
  }, [feed, showMembersPanel]);

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
    const userId = user?._id || user?.id;
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
      const fallbackMessage = res.status === 404
        ? 'Delete route is unavailable. Restart the backend server and try again.'
        : isReply ? 'Unable to delete reply.' : isComment ? 'Unable to delete comment.' : 'Unable to delete message.';
      setUiMessage({ type: 'error', text: data.message || fallbackMessage });
      return;
    }
    setPendingDeleteTarget(null);
    setUiMessage(null);
    await load();
  };

  const openReplyComposer = (post) => {
    setComposerState({
      type: 'reply',
      postId: post._id,
      authorName: post.authorName || 'Member',
      timeLabel: formatMessageTime(post.createdAt),
    });
  };

  const openEditComposer = (post) => {
    setComposerState({
      type: 'edit',
      postId: post._id,
      authorName: post.authorName || 'You',
      timeLabel: formatMessageTime(post.createdAt),
      initialText: post.content || '',
    });
  };

  const openEditCommentComposer = (post, comment) => {
    setComposerState({
      type: 'editComment',
      postId: post._id,
      commentId: comment._id,
      authorName: comment.name || 'You',
      timeLabel: formatMessageTime(comment.createdAt),
      initialText: comment.text || '',
    });
  };

  const openThreadReplyComposer = (post, commentId, entry, isReply = false) => {
    setComposerState({
      type: 'replyComment',
      postId: post._id,
      commentId,
      replyToId: isReply ? entry._id : '',
      replyToName: entry?.name || '',
      authorName: entry?.name || 'Member',
      timeLabel: formatMessageTime(entry?.createdAt),
    });
  };

  const openEditThreadComposer = (post, commentId, entry, isReply = false) => {
    if (isReply) {
      setComposerState({
        type: 'editReply',
        postId: post._id,
        commentId,
        replyId: entry._id,
        authorName: entry?.name || 'You',
        timeLabel: formatMessageTime(entry?.createdAt),
        initialText: entry?.text || '',
      });
      return;
    }
    openEditCommentComposer(post, entry);
  };

  const requestDeleteComment = (post, comment) => {
    setPendingDeleteTarget({ type: 'comment', postId: post._id, commentId: comment._id });
  };

  const requestDeleteThreadItem = (post, commentId, entry, isReply = false) => {
    if (isReply) {
      setPendingDeleteTarget({ type: 'reply', postId: post._id, commentId, replyId: entry._id });
      return;
    }
    requestDeleteComment(post, entry);
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

  const loadSelectedChannelMembers = async (channelId = selectedChannelId) => {
    if (!channelId || !userId) return;
    const res = await fetch(`/api/channels/${channelId}/members`, { headers: { 'x-user-id': userId } });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setSelectedChannelMembers([]);
      return;
    }
    setSelectedChannelMembers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadChannels();
  }, [feed, user?._id, user?.id]);

  useEffect(() => {
    if (userId) {
      loadApprovedUsers();
    }
  }, [userId]);

  useEffect(() => {
    if (currentChannel?._id && userId) {
      loadMembers();
    }
  }, [currentChannel?._id, userId, feed]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [feed, userId, feedReadAt]);

  useEffect(() => {
    if (loading || initialScrollDoneRef.current || displayPosts.length === 0) return;

    const lastReadTimestamp = feedReadAt ? new Date(feedReadAt).getTime() : 0;
    const hasReadMarker = Boolean(feedReadAt);
    const latestUnreadPost = hasReadMarker
      ? [...displayPosts].reverse().find(post => new Date(post.createdAt).getTime() > lastReadTimestamp && String(post.authorId || '') !== String(userId || ''))
      : null;

    if (latestUnreadPost && postRefs.current[latestUnreadPost._id]) {
      postRefs.current[latestUnreadPost._id].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (feedBottomRef.current) {
      feedBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    const newestTimestamp = displayPosts[displayPosts.length - 1]?.createdAt || null;
    if (newestTimestamp) {
      updateBackendReadState(newestTimestamp);
    }

    initialScrollDoneRef.current = true;
  }, [displayPosts, feed, feedReadAt, loading, userId]);

  useEffect(() => {
    setComposerState(null);
  }, [feed]);

  useEffect(() => {
    if (manageOpen) {
      loadChannels();
    }
  }, [manageOpen]);

  useEffect(() => {
    if (!slugTouched || !slugManualEdit) setCreateSlug(slugify(createName));
  }, [createName, slugTouched, slugManualEdit]);

  const selectedChannel = channels.find(c => c._id === selectedChannelId);
  const manageSectionStyle = {
    marginTop: 10,
    border: '1px solid rgba(109,44,44,0.1)',
    borderRadius: 18,
    padding: 12,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(251,242,246,0.92))',
    boxShadow: '0 8px 20px rgba(109,44,44,0.05)',
    boxSizing: 'border-box',
  };
  const manageInputStyle = {
    width: '100%',
    borderRadius: 12,
    border: '1px solid rgba(109,44,44,0.14)',
    background: 'rgba(255,255,255,0.92)',
    padding: '9px 12px',
    color: '#402126',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
    boxSizing: 'border-box',
    fontSize: 13,
  };
  const managePillButtonStyle = {
    border: '1px solid rgba(109,44,44,0.14)',
    background: 'rgba(255,255,255,0.84)',
    color: '#6d2c2c',
    borderRadius: 999,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
  };
  const managePrimaryButtonStyle = {
    border: 'none',
    background: 'linear-gradient(135deg,#6d2c2c,#e7a0ba)',
    color: '#fff',
    borderRadius: 999,
    padding: '9px 16px',
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 6px 16px rgba(109,44,44,0.15)',
    fontSize: 12,
  };

  useEffect(() => {
    if (!selectedChannel) return;
    setRuleRoles(Array.isArray(selectedChannel.includeRoles) ? selectedChannel.includeRoles : []);
    setRuleStatuses(Array.isArray(selectedChannel.includeMemberStatuses) ? selectedChannel.includeMemberStatuses : []);
    setSelectedManualUserId('');
    setSelectedExcludedUserId('');
    loadSelectedChannelMembers(selectedChannel._id);
  }, [selectedChannel?._id]);

  const createChannel = async () => {
    const safeSlug = slugify(createSlug || createName);
    if (!createName.trim() || !safeSlug || !userId) return;
    setManageMsg('');
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        name: createName.trim(),
        slug: safeSlug,
        includeRoles: ruleRoles,
        includeMemberStatuses: ruleStatuses,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setManageMsg(data.message || 'Create failed');
    setCreateName('');
    setCreateSlug('');
    setSlugTouched(false);
    setSlugManualEdit(false);
    setRuleRoles([]);
    setRuleStatuses([]);
    setSelectedChannelId(data?._id || '');
    setManageMsg('Channel created');
    await loadChannels();
  };

  const archiveToggle = async (channel) => {
    if (!userId) return;
    const res = await fetch(`/api/channels/${channel._id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ isArchived: !channel.isArchived }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setManageMsg(data.message || 'Archive update failed');
    setManageMsg(channel.isArchived ? 'Channel unarchived' : 'Channel archived');
    await loadChannels();
  };

  const deleteChannel = async (channel) => {
    if (!userId) return;
    if (isWebTeamUser && channelHasPosts(channel)) {
      const confirmed = window.confirm('This will permanently remove the channel and its posts may become orphaned unless handled. Continue?');
      if (!confirmed) return;
    }
    const res = await fetch(`/api/channels/${channel._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setManageMsg(data.message || 'Delete failed');
    setManageMsg('Channel deleted');
    await loadChannels();
  };

  const saveRules = async () => {
    if (!selectedChannel?._id || !userId) return;
    const res = await fetch(`/api/channels/${selectedChannel._id}/rules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ includeRoles: ruleRoles, includeMemberStatuses: ruleStatuses }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setManageMsg(data.message || 'Rules update failed');
    setManageMsg('Rules updated');
  };

  const mutateMembers = async (type, addIds = [], removeIds = []) => {
    if (!selectedChannel?._id || !userId) return;
    const res = await fetch(`/api/channels/${selectedChannel._id}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ add: addIds, remove: removeIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setManageMsg(data.message || 'Membership update failed');
    setManageMsg('Membership updated');
    await loadChannels();
    await loadSelectedChannelMembers(selectedChannel?._id);
  };

  const addSpecificMember = async () => {
    if (!selectedManualUserId) return;
    await mutateMembers('excluded-members', [], [selectedManualUserId]);
    await mutateMembers('manual-members', [selectedManualUserId], []);
    setManageMsg('Member added to channel');
  };

  const removeSpecificMember = async (memberId = selectedExcludedUserId) => {
    if (!memberId) return;
    await mutateMembers('manual-members', [], [memberId]);
    await mutateMembers('excluded-members', [memberId], []);
    setManageMsg('Member removed from channel');
  };

  const restoreExcludedMember = async () => {
    if (!selectedExcludedUserId) return;
    await mutateMembers('excluded-members', [], [selectedExcludedUserId]);
    setManageMsg('Member restored to rule-based access');
  };

  const rawSlug = String(createSlug || '').trim();
  const sanitizedSlug = slugify(rawSlug);
  const slugValid = rawSlug.length > 0
    && rawSlug === sanitizedSlug
    && /^[a-z][a-zA-Z0-9]*$/.test(rawSlug);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ height: isNarrow ? 'auto' : 'calc(100vh - 84px)', minHeight: 0, maxHeight: isNarrow ? 'none' : 'calc(100vh - 84px)', overflow: isNarrow ? 'visible' : 'hidden', paddingBottom: isNarrow ? 8 : 12, boxSizing: 'border-box', width: '100%' }}>
      <style>{`
        .psr-chat-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 96, 138, 0.38) rgba(250, 248, 249, 0.7);
        }
        .psr-chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .psr-chat-scrollbar::-webkit-scrollbar-track {
          background: rgba(250, 248, 249, 0.72);
          border-radius: 999px;
        }
        .psr-chat-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(236, 144, 184, 0.72), rgba(212, 96, 138, 0.54));
          border-radius: 999px;
          border: 2px solid rgba(250, 248, 249, 0.82);
        }
        .psr-chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(236, 144, 184, 0.9), rgba(212, 96, 138, 0.72));
        }
      `}</style>
      <motion.div layout style={{ background: 'linear-gradient(180deg, rgba(255,250,252,0.985), rgba(248,232,238,0.98))', border: '1px solid rgba(109,44,44,0.12)', borderRadius: isPhone ? 12 : 22, overflow: 'hidden', boxShadow: 'none', height: isNarrow ? 'auto' : '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }}>
        
        <motion.div layout style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', justifyContent: 'space-between', alignItems: isPhone ? 'stretch' : 'center', gap: 8, padding: isPhone ? '10px 12px' : '12px 18px 10px', borderBottom: '1px solid rgba(109,44,44,0.09)', background: 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(243,222,232,0.58))', position: 'sticky', top: 0, zIndex: 2, boxSizing: 'border-box', width: '100%' }}>
          <div>
            <div style={{ color: '#6d2c2c', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1, fontWeight: 700 }}>📌 Pinned channel</div>
            <h1 style={{ margin: 0, fontSize: isPhone ? 18 : 22, color: '#3b2327' }}>{FEED_TITLES[feed] || currentChannel?.name || 'Feed'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isPhone ? '100%' : 'auto' }}>
            {currentChannel?._id && (
              <motion.button whileHover={{ y: -1, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING_TRANSITION} onClick={() => setShowMembersPanel(prev => !prev)} style={{ border: '1px solid rgba(109,44,44,0.12)', background: 'rgba(255,255,255,0.74)', color: '#5a3034', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11, boxShadow: '0 6px 14px rgba(109,44,44,0.05)', flex: isPhone ? 1 : 'initial' }}>
                {showMembersPanel ? 'Hide members' : 'Show members'}
              </motion.button>
            )}
            {canOpenManage && <motion.button whileHover={{ y: -1, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING_TRANSITION} onClick={() => setManageOpen(true)} style={{ border: '1px solid rgba(109,44,44,0.12)', background: 'rgba(255,255,255,0.74)', color: '#5a3034', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11, boxShadow: '0 6px 14px rgba(109,44,44,0.05)', flex: isPhone ? 1 : 'initial' }}>Manage Channels</motion.button>}
          </div>
        </motion.div>

        {isArchived && (
          <div style={{ margin: '8px 12px 0', border: '1px solid #f2c9c9', background: '#fff7f7', borderRadius: 6, padding: 6, color: '#7f1d1d', fontSize: 12 }}>
            This channel is archived. Posting is locked.
          </div>
        )}

        {uiMessage && (
          <div style={{ margin: '8px 12px 0', border: `1px solid ${uiMessage.type === 'error' ? 'rgba(178,34,34,0.18)' : 'rgba(109,44,44,0.12)'}`, background: uiMessage.type === 'error' ? 'rgba(255,244,246,0.95)' : 'rgba(255,255,255,0.86)', borderRadius: 8, padding: '8px 10px', color: '#6d2c2c', display: 'flex', flexDirection: isPhone ? 'column' : 'row', justifyContent: 'space-between', gap: 8, alignItems: isPhone ? 'flex-start' : 'center', fontSize: 12 }}>
            <span>{uiMessage.text}</span>
            <button type="button" onClick={() => setUiMessage(null)} style={{ border: 'none', background: 'transparent', color: '#6d2c2c', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>Dismiss</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: showMembersPanel && !isNarrow ? 'minmax(0,1fr) 220px' : 'minmax(0,1fr)', flex: 1, minHeight: 0, background: '#fbf2f6', overflow: 'hidden', boxSizing: 'border-box', width: '100%' }}>
          <div ref={messageListRef} className="psr-chat-scrollbar" style={{ padding: isPhone ? '6px 2px 0' : '10px 0 0', borderRight: showMembersPanel && !isNarrow ? '1px solid rgba(109,44,44,0.09)' : 'none', overflowY: isNarrow ? 'visible' : 'auto', minHeight: 0, background: 'linear-gradient(180deg, rgba(251,242,246,0.94), rgba(249,238,243,0.96))', boxSizing: 'border-box' }}>
            {loading && <div style={{ color: '#5a3034', padding: '14px 16px', fontSize: 13 }}>Loading…</div>}
            {!loading && displayPosts.length === 0 && <div style={{ color: '#5a3034', padding: '14px 16px', fontSize: 13 }}>No posts yet.</div>}
            {!loading && displayPosts.map((p, index) => (
              <div key={p._id} ref={node => { if (node) postRefs.current[p._id] = node; else delete postRefs.current[p._id]; }} style={{ padding: '0 4px', boxSizing: 'border-box', width: '100%' }}>
                <PostCard
                  post={p}
                  onDeleteRequest={requestDeletePost}
                  onReplyRequest={openReplyComposer}
                  onEditRequest={openEditComposer}
                  onThreadReplyRequest={openThreadReplyComposer}
                  onEditCommentRequest={openEditThreadComposer}
                  onDeleteCommentRequest={requestDeleteThreadItem}
                  isGrouped={shouldGroupAdjacentPosts(displayPosts[index - 1], p)}
                  isCompact={isNarrow}
                />
              </div>
            ))}
            <div ref={feedBottomRef} />
          </div>

          {showMembersPanel && (
              <motion.aside initial={{ opacity: 0, x: isNarrow ? 0 : 10, y: isNarrow ? 6 : 0 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ background: 'linear-gradient(180deg, rgba(250,240,244,0.98), rgba(247,233,239,0.98))', padding: '10px 10px', minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: isNarrow ? '1px solid rgba(109,44,44,0.09)' : 'none', boxSizing: 'border-box' }}>
              <div style={{ color: '#3b2327', fontWeight: 800, marginBottom: 6, fontSize: 12 }}>Members</div>
              <div className="psr-chat-scrollbar" style={{ overflowY: isNarrow ? 'visible' : 'auto', minHeight: 0, paddingRight: 2, maxHeight: isNarrow ? 'none' : '100%', boxSizing: 'border-box' }}>
              {members.length === 0 ? (
                <div style={{ color: '#7b5d63', fontSize: 11 }}>No members yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {members.map(member => {
                    const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
                    const memberAvatar = member.profilePicUrl || member.avatar || '';
                    return (
                      <div key={member._id || memberName} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0', padding: '1px 0' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', background: '#fbf2f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#6d2c2c', border: '1px solid rgba(109,44,44,0.1)', flexShrink: 0 }}>
                          {memberAvatar ? <img src={memberAvatar} alt={memberName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} /> : getInitials(memberName)}
                        </div>
                        <div style={{ fontSize: 11, color: '#3b2327', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberName}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </motion.aside>
          )}
        </div>

        <div style={{ position: isNarrow ? 'static' : 'sticky', bottom: 0, borderTop: '1px solid rgba(109,44,44,0.09)', background: 'rgba(250,240,244,0.96)', padding: isPhone ? '8px 8px 10px' : '10px 14px 14px', zIndex: 2, boxSizing: 'border-box', width: '100%' }}>
          <CreatePost feed={feed} canPost={canPost} canBlast={canBlast} onPosted={load} postingLocked={isArchived} composerState={composerState} onClearComposerState={() => setComposerState(null)} onError={(text) => setUiMessage({ type: 'error', text })} isCompact={isNarrow} isPhone={isPhone} />
        </div>
      </motion.div>

      <ConfirmDialog
        open={Boolean(pendingDeleteTarget)}
        title={pendingDeleteTarget?.type === 'reply' ? 'Delete Reply' : pendingDeleteTarget?.type === 'comment' ? 'Delete Comment' : 'Delete Message'}
        message={pendingDeleteTarget?.type === 'reply' ? 'Delete this reply?' : pendingDeleteTarget?.type === 'comment' ? 'Delete this comment?' : 'Delete this message?'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeletePost}
        onCancel={() => setPendingDeleteTarget(null)}
      />

      {manageOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(34,16,19,0.35)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isPhone ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, padding: isPhone ? 0 : 12 }}>
          <div className="psr-chat-scrollbar" style={{ background: 'linear-gradient(180deg, rgba(255,251,252,0.98), rgba(248,232,238,0.98))', borderRadius: isPhone ? '16px 16px 0 0' : 20, padding: isPhone ? 12 : 16, width: isPhone ? '100%' : '90%', maxWidth: 900, maxHeight: isPhone ? '90dvh' : '88vh', overflowY: 'auto', border: '1px solid rgba(109,44,44,0.12)', boxShadow: '0 25px 50px rgba(109,44,44,0.16)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', justifyContent: 'space-between', alignItems: isPhone ? 'stretch' : 'center', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, color: '#4a2328', fontSize: isPhone ? 18 : 22 }}>Manage Channels</h3>
                <div style={{ color: '#8a6a71', fontSize: 11, marginTop: 1 }}>Create channels, tune membership rules, and manage access.</div>
              </div>
              <button onClick={() => setManageOpen(false)} style={{ ...managePillButtonStyle, width: isPhone ? '100%' : 'auto' }}>Close</button>
            </div>
            {manageMsg && <div style={{ marginTop: 8, fontSize: 11, color: '#6d2c2c', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(109,44,44,0.08)', padding: '6px 8px', borderRadius: 10, boxSizing: 'border-box' }}>{manageMsg}</div>}

            {canCreateChannels && (
              <div style={manageSectionStyle}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: '#5a3034', fontSize: 15 }}>Create Channel</div>
                <div style={{ display: 'grid', gap: 6, boxSizing: 'border-box' }}>
                  <input placeholder="Name" value={createName} onChange={e => setCreateName(e.target.value)} style={manageInputStyle} />
                  <div style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <input
                      placeholder="slug"
                      value={createSlug}
                      readOnly={!slugManualEdit}
                      onChange={e => {
                        setSlugTouched(true);
                        setCreateSlug(e.target.value);
                      }}
                      style={{ ...manageInputStyle, flex: 1, background: slugManualEdit ? 'rgba(255,255,255,0.96)' : 'rgba(248,245,246,0.88)' }}
                    />
                    {canOverrideSlug && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlugManualEdit(prev => {
                            const next = !prev;
                            if (!next) {
                              setCreateSlug(slugify(createName));
                            }
                            return next;
                          });
                        }}
                        style={{ ...managePillButtonStyle, width: isPhone ? '100%' : 'auto', fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        {slugManualEdit ? 'Lock slug' : 'Edit slug'}
                      </button>
                    )}
                  </div>
                  {!rawSlug && <div style={{ fontSize: 10, color: '#b91c1c' }}>Slug is required.</div>}
                  {!!rawSlug && !slugValid && (
                    <div style={{ fontSize: 10, color: '#b91c1c' }}>
                      Use letters/numbers only, no spaces or special characters.
                    </div>
                  )}
                  <button onClick={createChannel} disabled={!createName.trim() || !slugValid} style={{ ...managePrimaryButtonStyle, opacity: !createName.trim() || !slugValid ? 0.55 : 1, width: isPhone ? '100%' : 'auto' }}>
                    Create
                  </button>
                </div>
              </div>
            )}

            <div style={manageSectionStyle}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: '#5a3034', fontSize: 15 }}>Channels</div>
              {channels.map(c => (
                <div key={c._id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(109,44,44,0.08)', display: 'flex', flexDirection: isPhone ? 'column' : 'row', justifyContent: 'space-between', alignItems: isPhone ? 'stretch' : 'center', gap: 8, boxSizing: 'border-box' }}>
                  <div>
                    <div style={{ color: '#4a2328', fontWeight: 700, fontSize: 13 }}>{c.name} <span style={{ color: '#7a6670', fontWeight: 500, fontSize: 11 }}>({c.slug})</span></div>
                    <div style={{ fontSize: 10, color: c.isArchived ? '#b91c1c' : '#166534' }}>{c.isArchived ? 'Archived' : 'Active'}</div>
                    {isExecCreator(c) && channelHasPosts(c) && !isWebTeamUser && (
                      <div style={{ fontSize: 10, color: '#666' }}>Channels with posts must be archived.</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canArchiveChannel(c) && <button onClick={() => archiveToggle(c)} style={{ ...managePillButtonStyle, fontSize: 10, padding: '5px 8px' }}>{c.isArchived ? 'Unarchive' : 'Archive'}</button>}
                    {canDeleteChannel(c) && <button onClick={() => deleteChannel(c)} style={{ ...managePillButtonStyle, fontSize: 10, padding: '5px 8px' }}>Delete</button>}
                    {canManageMembersChannel(c) && <button onClick={() => setSelectedChannelId(c._id)} style={{ ...managePillButtonStyle, fontSize: 10, padding: '5px 8px' }}>Edit Members</button>}
                  </div>
                </div>
              ))}
            </div>

            {selectedChannel && canManageMembersChannel(selectedChannel) && (
              <div style={manageSectionStyle}>
                <div style={{ fontWeight: 800, marginBottom: 5, color: '#5a3034', fontSize: 15 }}>Edit Members: {selectedChannel.name}</div>
                <div style={{ fontSize: 10, color: '#76616a', marginBottom: 6 }}>
                  Excluded members are always removed even if included by role/status.
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, marginBottom: 3, color: '#4f2f32', fontWeight: 700 }}>Include Roles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {ROLE_OPTIONS.map(r => (
                      <label key={r} style={{ fontSize: 10, color: '#5a3034', background: 'rgba(255,255,255,0.72)', padding: '3px 6px', borderRadius: 999, border: '1px solid rgba(109,44,44,0.08)' }}>
                        <input
                          type="checkbox"
                          checked={ruleRoles.includes(r)}
                          onChange={e => {
                            if (e.target.checked) setRuleRoles(prev => [...prev, r]);
                            else setRuleRoles(prev => prev.filter(x => x !== r));
                          }}
                        />{' '}
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, marginBottom: 3, color: '#4f2f32', fontWeight: 700 }}>Include Member Statuses</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {MEMBER_STATUS_OPTIONS.map(s => (
                      <label key={s} style={{ fontSize: 10, color: '#5a3034', background: 'rgba(255,255,255,0.72)', padding: '3px 6px', borderRadius: 999, border: '1px solid rgba(109,44,44,0.08)' }}>
                        <input
                          type="checkbox"
                          checked={ruleStatuses.includes(s)}
                          onChange={e => {
                            if (e.target.checked) setRuleStatuses(prev => [...prev, s]);
                            else setRuleStatuses(prev => prev.filter(x => x !== s));
                          }}
                        />{' '}
                        {s}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={saveRules} style={{ ...managePrimaryButtonStyle, width: isPhone ? '100%' : 'auto', fontSize: 11, padding: '7px 12px' }}>Save Rules</button>
                  </div>
                </div>

                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, marginBottom: 3, color: '#4f2f32', fontWeight: 700 }}>Add Specific Member</div>
                  <select value={selectedManualUserId} onChange={e => setSelectedManualUserId(e.target.value)} style={manageInputStyle}>
                    <option value="">Select user</option>
                    {approvedUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: 5, display: 'flex', flexDirection: isPhone ? 'column' : 'row', gap: 5 }}>
                    <button disabled={!selectedManualUserId} onClick={addSpecificMember} style={{ ...managePrimaryButtonStyle, opacity: !selectedManualUserId ? 0.55 : 1, width: isPhone ? '100%' : 'auto', fontSize: 11, padding: '7px 12px' }}>Add Member</button>
                    <button disabled={!selectedManualUserId} onClick={() => mutateMembers('manual-members', [], [selectedManualUserId])} style={{ ...managePillButtonStyle, opacity: !selectedManualUserId ? 0.55 : 1, width: isPhone ? '100%' : 'auto', fontSize: 11, padding: '7px 12px' }}>Remove Manual Override</button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, marginBottom: 3, color: '#4f2f32', fontWeight: 700 }}>Remove or Restore Member</div>
                  <select value={selectedExcludedUserId} onChange={e => setSelectedExcludedUserId(e.target.value)} style={manageInputStyle}>
                    <option value="">Select user</option>
                    {approvedUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: 5, display: 'flex', flexDirection: isPhone ? 'column' : 'row', gap: 5 }}>
                    <button disabled={!selectedExcludedUserId} onClick={() => removeSpecificMember()} style={{ ...managePrimaryButtonStyle, opacity: !selectedExcludedUserId ? 0.55 : 1, width: isPhone ? '100%' : 'auto', fontSize: 11, padding: '7px 12px' }}>Remove Member</button>
                    <button disabled={!selectedExcludedUserId} onClick={restoreExcludedMember} style={{ ...managePillButtonStyle, opacity: !selectedExcludedUserId ? 0.55 : 1, width: isPhone ? '100%' : 'auto', fontSize: 11, padding: '7px 12px' }}>Restore Member</button>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, marginBottom: 5, fontWeight: 700, color: '#4f2f32' }}>Current Channel Members</div>
                  <div className="psr-chat-scrollbar" style={{ display: 'grid', gap: 5, maxHeight: 150, overflowY: 'auto', paddingRight: 3, boxSizing: 'border-box' }}>
                    {selectedChannelMembers.map(member => {
                      const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
                      return (
                        <div key={member._id} style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', alignItems: isPhone ? 'stretch' : 'center', justifyContent: 'space-between', gap: 6, border: '1px solid #f1e5e8', borderRadius: 10, padding: '6px 8px', background: 'rgba(255,255,255,0.78)', boxSizing: 'border-box' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#4a2328', fontSize: 12 }}>{memberName}</div>
                            <div style={{ fontSize: 10, color: '#6b6570' }}>{Array.isArray(member.role) ? member.role.join(', ') : ''}</div>
                          </div>
                          <button type="button" onClick={() => removeSpecificMember(member._id)} style={{ ...managePillButtonStyle, width: isPhone ? '100%' : 'auto', fontSize: 10, padding: '4px 8px' }}>
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    {selectedChannelMembers.length === 0 && <div style={{ fontSize: 10, color: '#6b6570' }}>No members resolved for this channel yet.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
