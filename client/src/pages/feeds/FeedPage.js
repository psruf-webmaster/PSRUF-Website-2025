import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const FEED_TITLES = {
  chapterAnnouncements: 'Chapter Announcements',
  penguinParties: 'Penguin Parties',
  officerFeed: 'Officer Feed',
};

const ROLE_OPTIONS = [
  'pending', 'pnm', 'candidate', 'candOfficer', 'member',
  'alumni', 'officer', 'exec', 'webmaster', 'webdev',
];
const MEMBER_STATUS_OPTIONS = [
  'active', 'inactive', 'probation', 'seniorStatus',
  'scholarship', 'co-op', 'dropped',
];
const SMS_ALLOWED_POSITION_KEYS = ['VP_COMMUNICATIONS', 'WEBMASTER', 'WEBDEV'];

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

function CreatePost({ feed, canPost, canBlast, onPosted, postingLocked }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sendAsText, setSendAsText] = useState(false);
  const [audienceType, setAudienceType] = useState('channel');
  const [includeRoles, setIncludeRoles] = useState([]);
  const [includeMemberStatuses, setIncludeMemberStatuses] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const canSendSms = Array.isArray(user?.positions)
    ? user.positions.some(p => SMS_ALLOWED_POSITION_KEYS.includes(p?.key))
    : false;

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

  const submit = async () => {
    if (!content.trim() || !user) return;
    if (postingLocked) return;
    if (sendAsText && audienceType === 'specific' && selectedUserIds.length === 0) return;
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
        sendAsText: canSendSms ? sendAsText : false,
        audienceType: sendAsText ? audienceType : undefined,
        channelSlug: sendAsText && audienceType === 'channel' ? feed : undefined,
        includeRoles: sendAsText && audienceType === 'roleStatus' ? includeRoles : undefined,
        includeMemberStatuses: sendAsText && audienceType === 'roleStatus' ? includeMemberStatuses : undefined,
        selectedUserIds: sendAsText && audienceType === 'specific' ? selectedUserIds : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      alert(data.message || 'Server error creating post');
      return;
    }
    setContent('');
    setSendAsText(false);
    setAudienceType('channel');
    setIncludeRoles([]);
    setIncludeMemberStatuses([]);
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
        disabled={postingLocked}
        style={{ width: '100%', border: '1px solid #ccc', borderRadius: 8, padding: 8, background: postingLocked ? '#f9fafb' : '#fff' }}
      />
      {canSendSms && (
        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <label>
            <input type="checkbox" checked={sendAsText} onChange={e => setSendAsText(e.target.checked)} /> Also send as a text blast
          </label>
          {sendAsText && (
            <select value={audienceType} onChange={e => setAudienceType(e.target.value)}>
              <option value="channel">All Sisters (Channel Members)</option>
              <option value="roleStatus">By Role/Status</option>
              <option value="specific">Specific Users</option>
            </select>
          )}
        </div>
      )}
      {sendAsText && audienceType === 'roleStatus' && (
        <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Roles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLE_OPTIONS.map(r => (
              <label key={r} style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={includeRoles.includes(r)}
                  onChange={e => {
                    if (e.target.checked) setIncludeRoles(prev => [...prev, r]);
                    else setIncludeRoles(prev => prev.filter(x => x !== r));
                  }}
                />{' '}
                {r}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 13, marginTop: 8, marginBottom: 4 }}>Member Statuses</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MEMBER_STATUS_OPTIONS.map(s => (
              <label key={s} style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={includeMemberStatuses.includes(s)}
                  onChange={e => {
                    if (e.target.checked) setIncludeMemberStatuses(prev => [...prev, s]);
                    else setIncludeMemberStatuses(prev => prev.filter(x => x !== s));
                  }}
                />{' '}
                {s}
              </label>
            ))}
          </div>
        </div>
      )}
      {sendAsText && audienceType === 'specific' && (
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
        <button onClick={submit} className="btn" disabled={postingLocked || submitting || !content.trim()}>
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
          {post.smsResult.error
            ? 'SMS skipped: Not authorized'
            : (post.smsResult.sent != null
              ? `Sent as text to ${post.smsResult.sent || 0} recipient${(post.smsResult.sent || 0) === 1 ? '' : 's'}`
              : 'SMS failed')}
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
  const [channels, setChannels] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [selectedManualUserId, setSelectedManualUserId] = useState('');
  const [selectedExcludedUserId, setSelectedExcludedUserId] = useState('');
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugManualEdit, setSlugManualEdit] = useState(false);
  const [ruleRoles, setRuleRoles] = useState([]);
  const [ruleStatuses, setRuleStatuses] = useState([]);
  const [manageMsg, setManageMsg] = useState('');

  const canPost = feed === 'penguinParties'
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

  const loadChannels = async () => {
    const headers = userId ? { 'x-user-id': userId } : {};
    const res = await fetch('/api/channels', { headers });
    const data = await res.json().catch(() => []);
    if (!res.ok) return setChannels([]);
    const list = Array.isArray(data) ? data : [];
    setChannels(list);
    if (!selectedChannelId && list.length) {
      const found = list.find(c => c.slug === feed);
      setSelectedChannelId(found?._id || list[0]._id);
    }
  };

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

  const loadMembers = async () => {
    if (!currentChannel?._id || !userId) return;
    setMembersLoading(true);
    const res = await fetch(`/api/channels/${currentChannel._id}/members`, {
      headers: { 'x-user-id': userId },
    });
    const data = await res.json().catch(() => []);
    setMembersLoading(false);
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
    // eslint-disable-next-line
  }, [feed, user?._id, user?.id]);

  useEffect(() => {
    if (manageOpen) {
      loadChannels();
      loadApprovedUsers();
    }
    // eslint-disable-next-line
  }, [manageOpen]);

  useEffect(() => {
    if (!slugTouched || !slugManualEdit) setCreateSlug(slugify(createName));
  }, [createName, slugTouched, slugManualEdit]);

  const selectedChannel = channels.find(c => c._id === selectedChannelId);

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
  };

  const rawSlug = String(createSlug || '').trim();
  const sanitizedSlug = slugify(rawSlug);
  const slugValid = rawSlug.length > 0
    && rawSlug === sanitizedSlug
    && /^[a-z][a-zA-Z0-9]*$/.test(rawSlug);

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1>{FEED_TITLES[feed] || currentChannel?.name || 'Feed'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {currentChannel?._id && (
            <button onClick={() => { setMembersOpen(true); loadMembers(); }}>View members</button>
          )}
          {canOpenManage && <button onClick={() => setManageOpen(true)}>Manage Channels</button>}
        </div>
      </div>
      {isArchived && (
        <div style={{ marginBottom: 10, border: '1px solid #f2c9c9', background: '#fff7f7', borderRadius: 8, padding: 8 }}>
          This channel is archived. Posting is locked.
        </div>
      )}
      <CreatePost feed={feed} canPost={canPost} canBlast={canBlast} onPosted={load} postingLocked={isArchived} />
      {loading && <div>Loading…</div>}
      {!loading && posts.length === 0 && <div>No posts yet.</div>}
      {posts.map(p => <PostCard key={p._id} post={p} onCommented={load} />)}

      {membersOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, width: '92%', maxWidth: 620, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Channel Members</h3>
              <button onClick={() => setMembersOpen(false)}>Close</button>
            </div>
            {membersLoading && <div style={{ marginTop: 10 }}>Loading…</div>}
            {!membersLoading && members.length === 0 && <div style={{ marginTop: 10 }}>No members found.</div>}
            {!membersLoading && members.map(m => (
              <div key={m._id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <div>{m.firstName} {m.lastName}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {Array.isArray(m.role) ? m.role.join(', ') : ''} {Array.isArray(m.memberStatus) ? `• ${m.memberStatus.join(', ')}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {manageOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, width: '95%', maxWidth: 920, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Manage Channels</h3>
              <button onClick={() => setManageOpen(false)}>Close</button>
            </div>
            {manageMsg && <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>{manageMsg}</div>}

            {canCreateChannels && (
              <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Create Channel</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input placeholder="Name" value={createName} onChange={e => setCreateName(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="slug"
                      value={createSlug}
                      readOnly={!slugManualEdit}
                      onChange={e => {
                        setSlugTouched(true);
                        setCreateSlug(e.target.value);
                      }}
                      style={{ flex: 1, background: slugManualEdit ? '#fff' : '#f9fafb' }}
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
                      >
                        {slugManualEdit ? 'Lock slug' : 'Edit slug'}
                      </button>
                    )}
                  </div>
                  {!rawSlug && <div style={{ fontSize: 12, color: '#b91c1c' }}>Slug is required.</div>}
                  {!!rawSlug && !slugValid && (
                    <div style={{ fontSize: 12, color: '#b91c1c' }}>
                      Use letters/numbers only, no spaces or special characters.
                    </div>
                  )}
                  <button onClick={createChannel} disabled={!createName.trim() || !slugValid}>
                    Create
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Channels</div>
              {channels.map(c => (
                <div key={c._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>{c.name} <span style={{ color: '#666' }}>({c.slug})</span></div>
                    <div style={{ fontSize: 12, color: c.isArchived ? '#b91c1c' : '#166534' }}>{c.isArchived ? 'Archived' : 'Active'}</div>
                    {isExecCreator(c) && channelHasPosts(c) && !isWebTeamUser && (
                      <div style={{ fontSize: 12, color: '#666' }}>Channels with posts must be archived.</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {canArchiveChannel(c) && <button onClick={() => archiveToggle(c)}>{c.isArchived ? 'Unarchive' : 'Archive'}</button>}
                    {canDeleteChannel(c) && <button onClick={() => deleteChannel(c)}>Delete</button>}
                    {canManageMembersChannel(c) && <button onClick={() => setSelectedChannelId(c._id)}>Edit Members</button>}
                  </div>
                </div>
              ))}
            </div>

            {selectedChannel && canManageMembersChannel(selectedChannel) && (
              <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Edit Members: {selectedChannel.name}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Excluded members are always removed even if included by role/status.
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Include Roles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ROLE_OPTIONS.map(r => (
                      <label key={r} style={{ fontSize: 12 }}>
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
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Include Member Statuses</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {MEMBER_STATUS_OPTIONS.map(s => (
                      <label key={s} style={{ fontSize: 12 }}>
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
                  <div style={{ marginTop: 8 }}>
                    <button onClick={saveRules}>Save Rules</button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Manual Members</div>
                  <select value={selectedManualUserId} onChange={e => setSelectedManualUserId(e.target.value)}>
                    <option value="">Select user</option>
                    {approvedUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <button disabled={!selectedManualUserId} onClick={() => mutateMembers('manual-members', [selectedManualUserId], [])}>Add Manual</button>
                    <button disabled={!selectedManualUserId} onClick={() => mutateMembers('manual-members', [], [selectedManualUserId])}>Remove Manual</button>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Excluded Members</div>
                  <select value={selectedExcludedUserId} onChange={e => setSelectedExcludedUserId(e.target.value)}>
                    <option value="">Select user</option>
                    {approvedUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <button disabled={!selectedExcludedUserId} onClick={() => mutateMembers('excluded-members', [selectedExcludedUserId], [])}>Add Excluded</button>
                    <button disabled={!selectedExcludedUserId} onClick={() => mutateMembers('excluded-members', [], [selectedExcludedUserId])}>Remove Excluded</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
