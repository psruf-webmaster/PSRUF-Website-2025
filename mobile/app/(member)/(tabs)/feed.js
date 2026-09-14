import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../src/components/AppScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders, getUserId } from '../../../src/lib/api';
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

  const headers = useMemo(() => authHeaders(user), [user]);

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

    return () => {
      socket.disconnect();
    };
  }, [activeFeed, user]);

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
            <Text className="text-lg font-semibold text-ink">{post.authorName || 'Chapter update'}</Text>
            <Text className="text-sm font-medium uppercase tracking-[2px] text-accent">{formatTimestamp(post.createdAt)}</Text>
            <Text className="text-base leading-6 text-muted">{post.content || 'No text content.'}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
