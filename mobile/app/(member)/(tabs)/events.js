import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../src/components/AppScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';

function formatEventDate(value) {
  if (!value) {
    return 'Date pending';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date pending';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadEvents(isRefreshing = false) {
    if (!user) {
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/events', {
        params: { view: 'allUpcoming' },
        headers: authHeaders(user),
      });
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [user]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-shell">
      <ScrollView
        className="flex-1 bg-shell"
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(true)} />}
      >
        <Card className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Upcoming</Text>
          <Text className="text-3xl font-semibold text-ink">Chapter events</Text>
          <Text className="text-base leading-6 text-muted">This screen reads the live `/api/events?view=allUpcoming` list with the same bearer-id auth pattern used on web.</Text>
          <Pressable onPress={() => loadEvents(true)} className="self-start rounded-full border border-line px-5 py-3">
            <Text className="text-sm font-semibold text-ink">Reload events</Text>
          </Pressable>
        </Card>

        {loading ? <Text className="text-base text-muted">Loading events...</Text> : null}
        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        {!loading && !events.length && !error ? (
          <Card>
            <Text className="text-base leading-6 text-muted">No upcoming events are visible for this account yet.</Text>
          </Card>
        ) : null}

        {events.map((eventItem) => (
          <Card key={eventItem._id} className="gap-2">
            <Text className="text-xl font-semibold text-ink">{eventItem.title || 'Untitled event'}</Text>
            <Text className="text-sm font-medium uppercase tracking-[2px] text-accent">{formatEventDate(eventItem.startAt)}</Text>
            <Text className="text-base leading-6 text-muted">{eventItem.location || 'Location to be announced'}</Text>
            {eventItem.description ? <Text className="text-base leading-6 text-muted">{eventItem.description}</Text> : null}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
