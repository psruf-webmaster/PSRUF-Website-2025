import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const FEED_TITLES = {
  chapterAnnouncements: 'Chapter Announcements',
  penguinParties: 'Penguin Parties',
  officerFeed: 'Officer Feed',
};

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

function CreatePost({ feed, canPost, canBlast, onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sendBlast, setSendBlast] = useState(false);
  const [scope, setScope] = useState('ALL');
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
    if (sendBlast && scope === 'specific') {
      loadUsers();
    }
  }, [sendBlast, scope]);

  const submit = async () => {
    if (!content.trim() || !user) return;
    if (sendBlast && scope === 'specific' && selectedUserIds.length === 0) return;
    setSubmitting(true);
    const userId = user?._id || user?.id;

    const res = await fetch(`/api/feeds/${feed}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || '',     // server uses this to find the user
      },
      body: JSON.stringify({
        content: content.trim(),
        sendTextBlast: canBlast ? sendBlast : false,
        blastAudience: canBlast && sendBlast ? { scope } : undefined,
        sendAsText: sendBlast,
        audienceType: scope === 'specific' ? 'specific' : scope,
        selectedUserIds: scope === 'specific' ? selectedUserIds : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      alert(data.message || 'Server error creating post');
      return;
    }
    setContent('');
    setSendBlast(false);
    setSelectedUserIds([]);
    onPosted && onPosted();
  };

  if (!canPost) return null;

  return (
    <div className="card" style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12, marginBottom: 16, background: '#fff' }}>
      <textarea
        placeholder="Share an update…"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        style={{ width: '100%', border: '1px solid #ccc', borderRadius: 8, padding: 8 }}
      />
      {canBlast && (
        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <label>
            <input type="checkbox" checked={sendBlast} onChange={e => setSendBlast(e.target.checked)} /> Also send as a text blast
          </label>
          {sendBlast && (
            <select value={scope} onChange={e => setScope(e.target.value)}>
              <option value="ALL">All Sisters</option>
              <option value="GROUPS">Selected Groups</option>
              <option value="specific">Specific Users</option>
            </select>
          )}
        </div>
      )}
      {sendBlast && scope === 'specific' && (
        <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 8, padding: 8, maxHeight: 180, overflowY: 'auto' }}>
          {userOptions.length === 0 && <div style={{ fontSize: 12, color: '#555' }}>No users available.</div>}
          {userOptions.map(u => (
            <label key={u._id} style={{ display: 'block', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(u._id)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedUserIds(prev => [...prev, u._id]);
                  } else {
                    setSelectedUserIds(prev => prev.filter(id => id !== u._id));
                  }
                }}
              />{' '}
              {u.firstName} {u.lastName} {u.role ? `(${Array.isArray(u.role) ? u.role.join(', ') : u.role})` : ''}
            </label>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <button onClick={submit} className="btn" disabled={submitting || !content.trim()}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, onCommented }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const addComment = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    const res = await fetch(`/api/feeds/posts/${post._id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?._id || user?.id || '' },
      body: JSON.stringify({ text: text.trim() }),
    });
    setPosting(false);
    if (res.ok) { setText(''); onCommented && onCommented(); }
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.message || 'Error adding comment');
    }
  };

  const when = post.createdAt ? new Date(post.createdAt).toLocaleString() : '';

  return (
    <div className="card" style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12, marginBottom: 16, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div><strong>{post.authorName}</strong> <span style={{ color: '#666' }}>• {post.authorRole?.join(', ')}</span></div>
        <div style={{ color: '#666' }}>{when}</div>
      </div>
      <div style={{ marginBottom: 10 }}>{post.content}</div>
      {post.sendTextBlast && <div style={{ fontSize: 12, color: '#555' }}>📢 Sent as text</div>}
      {post.smsResult && (
        <div style={{ fontSize: 12, color: post.smsResult.failed > 0 ? 'red' : '#555' }}>
          {post.smsResult.failed > 0
            ? 'SMS failed'
            : `📱 Sent as text to ${post.smsResult.sent || 0} recipient${(post.smsResult.sent || 0) === 1 ? '' : 's'}`}
        </div>
      )}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <input
          placeholder="Write a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ flex: 1, border: '1px solid #ccc', borderRadius: 8, padding: 8 }}
        />
        <button onClick={addComment} disabled={posting || !text.trim()}>Send</button>
      </div>
      {post.comments?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {post.comments.map(c => {
            const cWhen = c.createdAt ? new Date(c.createdAt).toLocaleString() : '';
            return (
              <div key={c._id || cWhen + c.text} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{c.name}</strong> <span style={{ color: '#666', fontSize: 12 }}>{cWhen}</span>
                <div>{c.text}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeedPage({ feed }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const canPost = feed === 'penguinParties'
    ? !!user
    : isOfficerLevel(user);

  const canBlast = user?.permissions?.includes('sms.send') === true;

  const load = async () => {
    if (!user) return; // wait for auth to load
    setLoading(true);
    const userId = user?._id || user?.id;
    const res = await fetch(`/api/feeds/${feed}/posts`, { headers: { 'x-user-id': userId || '' } });
    const data = await res.json().catch(() => ([]));
    setLoading(false);
    if (!res.ok) {
      alert(data.message || 'Failed to load posts');
      setPosts([]);
      return;
    }
    setPosts(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [feed, user?._id]);

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: '0 16px' }}>
      <h1>{FEED_TITLES[feed] || 'Feed'}</h1>
      <CreatePost feed={feed} canPost={canPost} canBlast={canBlast} onPosted={load} />
      {loading && <div>Loading…</div>}
      {!loading && posts.length === 0 && <div>No posts yet.</div>}
      {posts.map(p => <PostCard key={p._id} post={p} onCommented={load} />)}
    </div>
  );
}
