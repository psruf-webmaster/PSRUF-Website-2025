import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../src/components/AppScreen';
import { AttachmentPill, ChoiceChips, LabeledInput, Notice, ToggleTile } from '../../../src/components/MobileUI';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders, getUserId } from '../../../src/lib/api';
import { memberStatusOptions, roleOptions } from '../../../src/lib/adminOptions';
import { createAppSocket } from '../../../src/lib/socket';

function formatTimestamp(value) {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeFeed, setActiveFeed] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState('');
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [composerMessage, setComposerMessage] = useState('');
  const [editingPostId, setEditingPostId] = useState('');
  const [sendAsText, setSendAsText] = useState(false);
  const [audienceType, setAudienceType] = useState('channel');
  const [includeRoles, setIncludeRoles] = useState([]);
  const [includeMemberStatuses, setIncludeMemberStatuses] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const headers = useMemo(() => authHeaders(user), [user]);
  const canSendSms = Array.isArray(user?.permissions) && user.permissions.includes('sms.send');

  async function loadChannels() {
    const response = await api.get('/channels', { headers });
    const visibleChannels = Array.isArray(response.data)
      ? response.data.filter((channel) => channel?.canView !== false)
      : [];

    setChannels(visibleChannels);

    if (!activeFeed && visibleChannels.length) {
      setActiveFeed(visibleChannels[0].slug);
    }
  }

  async function loadPosts(feedSlug, isRefreshing = false) {
    if (!feedSlug) {
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const response = await api.get(`/feeds/${feedSlug}/posts`, { headers });
    const items = Array.isArray(response.data) ? response.data : [];
    setPosts(items.slice().reverse());
    setLoading(false);
    setRefreshing(false);
  }

  async function loadFeed(feedSlug = activeFeed, isRefreshing = false) {
    if (!user) {
      return;
    }

    setError('');

    try {
      await loadChannels();
      await loadPosts(feedSlug || activeFeed, isRefreshing);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to load feed.');
      setLoading(false);
      setRefreshing(false);
      setPosts([]);
    }
  }

  async function loadApprovedUsers() {
    try {
      const response = await api.get('/users/approved', { headers });
      setApprovedUsers(Array.isArray(response.data) ? response.data : []);
    } catch (_requestError) {
      setApprovedUsers([]);
    }
  }

  useEffect(() => {
    loadFeed();
  }, [user]);

  useEffect(() => {
    if (!activeFeed || !user) {
      return;
    }

    loadPosts(activeFeed);
  }, [activeFeed, user]);

  useEffect(() => {
    if (sendAsText && audienceType === 'specific' && user) {
      loadApprovedUsers();
    }
  }, [audienceType, sendAsText, user]);

  useEffect(() => {
    const userId = getUserId(user);
    if (!userId || !activeFeed) {
      return undefined;
    }

    const socket = createAppSocket({ auth: { userId } });

    socket.on('connect', () => {
      socket.emit('joinChannel', { slug: activeFeed });
    });

    socket.on('post:created', (post) => {
      setPosts((currentPosts) => {
        const alreadyPresent = currentPosts.some((item) => item?._id && item._id === post?._id);
        if (alreadyPresent) {
          return currentPosts;
        }
        return [post, ...currentPosts];
      });
    });

    socket.on('post:updated', (post) => {
      setPosts((currentPosts) => currentPosts.map((item) => item?._id === post?._id ? post : item));
    });

    socket.on('post:deleted', ({ id }) => {
      setPosts((currentPosts) => currentPosts.filter((item) => item?._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, [activeFeed, user]);

  function resetComposer() {
    setComposer('');
    setComposerAttachments([]);
    setSubmitting(false);
    setComposerMessage('');
    setEditingPostId('');
    setSendAsText(false);
    setAudienceType('channel');
    setIncludeRoles([]);
    setIncludeMemberStatuses([]);
    setSelectedUserIds([]);
    setUserSearch('');
  }

  function toggleList(setter, value) {
    setter((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  }

  async function pickComposerAttachments() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    });

    if (result.canceled) {
      return;
    }

    setComposerAttachments((current) => [...current, ...(result.assets || []).map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/octet-stream',
    }))]);
  }

  async function submitPost() {
    if ((!composer.trim() && composerAttachments.length === 0) || !activeFeed) {
      return;
    }

    if (sendAsText && audienceType === 'specific' && selectedUserIds.length === 0) {
      setError('Choose at least one member for a specific text blast.');
      return;
    }

    setSubmitting(true);
    setError('');
    setComposerMessage('');

    try {
      if (editingPostId) {
        await api.patch(`/feeds/posts/${editingPostId}`, { content: composer.trim() }, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        });
        setComposerMessage('Post updated.');
      } else {
        const formData = new FormData();
        formData.append('content', composer.trim());
        formData.append('sendAsText', String(canSendSms && sendAsText));

        if (canSendSms && sendAsText) {
          formData.append('audienceType', audienceType);
          formData.append('channelSlug', activeFeed);
          formData.append('includeRoles', JSON.stringify(includeRoles));
          formData.append('includeMemberStatuses', JSON.stringify(includeMemberStatuses));
          formData.append('selectedUserIds', JSON.stringify(selectedUserIds));
        }

        composerAttachments.forEach((asset, index) => {
          formData.append('attachments', {
            uri: asset.uri,
            name: asset.name || `attachment-${index + 1}`,
            type: asset.mimeType || 'application/octet-stream',
          });
        });

        await api.post(`/feeds/${activeFeed}/posts`, formData, { headers });
        setComposerMessage('Post sent.');
      }

      resetComposer();
      await loadPosts(activeFeed, true);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to submit post.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingPost(post) {
    setEditingPostId(post._id);
    setComposer(post.content || '');
    setComposerAttachments([]);
    setSendAsText(false);
    setAudienceType('channel');
    setComposerMessage('Editing your post.');
  }

  async function deletePost(postId) {
    setError('');
    try {
      await api.delete(`/feeds/posts/${postId}`, { headers });
      setPosts((currentPosts) => currentPosts.filter((post) => post._id !== postId));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to delete post.');
    }
  }

  const filteredUsers = approvedUsers
    .filter((member) => `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().includes(userSearch.toLowerCase()))
    .slice(0, 12);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-shell">
      <ScrollView
        className="flex-1 bg-shell"
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(activeFeed, true)} />}
        showsVerticalScrollIndicator={false}
      >
        <Card className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Realtime feed</Text>
          <Text className="text-3xl font-semibold text-ink">Channel posts</Text>
          <Text className="text-base leading-6 text-muted">Visible channels come from `/api/channels`, and post lists come from `/api/feeds/:feed/posts` with live Socket.IO joins on the selected feed.</Text>
        </Card>

        <Card className="gap-4 bg-[#f3e2d6]">
          <Text className="text-lg font-semibold text-ink">Compose post</Text>
          {composerMessage ? <Notice text={composerMessage} /> : null}
          <LabeledInput label="Message" value={composer} onChangeText={setComposer} placeholder="Share an update with this channel" multiline />
          <View className="flex-row flex-wrap gap-3">
            <Pressable onPress={pickComposerAttachments} className="rounded-full border border-line bg-white px-5 py-3">
              <Text className="text-sm font-semibold text-ink">Add attachments</Text>
            </Pressable>
            {editingPostId ? (
              <Pressable onPress={resetComposer} className="rounded-full border border-line bg-white px-5 py-3">
                <Text className="text-sm font-semibold text-ink">Cancel edit</Text>
              </Pressable>
            ) : null}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {composerAttachments.map((asset, index) => (
              <AttachmentPill key={`${asset.uri}-${index}`} label={asset.name || `Attachment ${index + 1}`} onRemove={() => setComposerAttachments((current) => current.filter((_, assetIndex) => assetIndex !== index))} />
            ))}
          </View>
          {canSendSms && !editingPostId ? (
            <View className="gap-4">
              <ToggleTile label="Send as text blast" detail="This uses the same SMS audience contract as the web feed composer." selected={sendAsText} onPress={() => setSendAsText((current) => !current)} />
              {sendAsText ? (
                <>
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-ink">Audience</Text>
                    <ChoiceChips options={[{ label: 'Channel', value: 'channel' }, { label: 'Role/status', value: 'roleStatus' }, { label: 'Specific people', value: 'specific' }]} selectedValues={audienceType} onToggle={setAudienceType} multi={false} />
                  </View>
                  {audienceType === 'roleStatus' ? (
                    <>
                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-ink">Roles</Text>
                        <ChoiceChips options={roleOptions} selectedValues={includeRoles} onToggle={(value) => toggleList(setIncludeRoles, value)} />
                      </View>
                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-ink">Member statuses</Text>
                        <ChoiceChips options={memberStatusOptions} selectedValues={includeMemberStatuses} onToggle={(value) => toggleList(setIncludeMemberStatuses, value)} />
                      </View>
                    </>
                  ) : null}
                  {audienceType === 'specific' ? (
                    <View className="gap-2">
                      <LabeledInput label="Search members" value={userSearch} onChangeText={setUserSearch} placeholder="Type a name" />
                      {filteredUsers.map((member) => {
                        const selected = selectedUserIds.includes(member._id);
                        return (
                          <Pressable key={member._id} onPress={() => toggleList(setSelectedUserIds, member._id)} className={`rounded-[24px] border px-4 py-4 ${selected ? 'border-accent bg-white' : 'border-line bg-card'}`}>
                            <Text className="text-base font-semibold text-ink">{`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member'}</Text>
                            <Text className="mt-1 text-sm leading-5 text-muted">Roles: {(member.role || []).join(', ') || 'none'} • Status: {(member.memberStatus || []).join(', ') || 'none'}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
          <Pressable onPress={submitPost} disabled={submitting || !activeFeed} className={`rounded-full px-5 py-4 ${submitting || !activeFeed ? 'bg-accent/60' : 'bg-accent'}`}>
            <Text className="text-center text-base font-semibold text-white">{submitting ? 'Sending...' : editingPostId ? 'Save post' : 'Post to channel'}</Text>
          </Pressable>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            {channels.map((channel) => {
              const selected = activeFeed === channel.slug;
              return (
                <Pressable
                  key={channel._id || channel.slug}
                  onPress={() => setActiveFeed(channel.slug)}
                  className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>
                    {channel.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {loading ? <Text className="text-base text-muted">Loading feed...</Text> : null}
        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        {!loading && !posts.length && !error ? (
          <Card>
            <Text className="text-base leading-6 text-muted">No posts are visible in this feed yet.</Text>
          </Card>
        ) : null}

        {posts.map((post) => (
          <Card key={post._id} className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <Text className="text-lg font-semibold text-ink">{post.authorName || 'Chapter update'}</Text>
                <Text className="text-sm font-medium uppercase tracking-[2px] text-accent">{formatTimestamp(post.createdAt)}</Text>
              </View>
              {post.authorAvatar ? <Image source={{ uri: post.authorAvatar }} className="h-11 w-11 rounded-full" /> : null}
            </View>
            <Text className="text-base leading-6 text-muted">{post.content || 'No text content.'}</Text>
            {Array.isArray(post.attachments) && post.attachments.length ? (
              <View className="flex-row flex-wrap gap-2">
                {post.attachments.map((attachment, index) => (
                  <AttachmentPill key={`${attachment.url || attachment.name}-${index}`} label={attachment.name || 'Attachment'} />
                ))}
              </View>
            ) : null}
            {String(post.authorId || '') === String(getUserId(user)) ? (
              <View className="flex-row flex-wrap gap-3 pt-2">
                <Pressable onPress={() => startEditingPost(post)} className="rounded-full border border-line bg-card px-4 py-2">
                  <Text className="text-sm font-semibold text-ink">Edit</Text>
                </Pressable>
                <Pressable onPress={() => deletePost(post._id)} className="rounded-full bg-[#8b3f3f] px-4 py-2">
                  <Text className="text-sm font-semibold text-white">Delete</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
