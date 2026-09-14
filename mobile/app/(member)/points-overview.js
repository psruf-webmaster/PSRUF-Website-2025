import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { InfoBlock, ListItem, Notice, ScreenHero } from '../../src/components/MobileUI';
import { useAuth } from '../../src/context/AuthContext';
import { api, authHeaders } from '../../src/lib/api';
import { canAccessPointsOverview } from '../../src/lib/access';

const statuses = ['all', 'active', 'inactive', 'probation', 'pending'];

export default function PointsOverviewScreen() {
  const { user } = useAuth();
  const allowed = canAccessPointsOverview(user);
  const headers = useMemo(() => authHeaders(user), [user]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!allowed) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.get('/requirements/active/overview', {
          headers,
          params: {
            status: status === 'all' ? undefined : status,
            search: query || undefined,
            limit: 25,
          },
        });

        if (!cancelled) {
          setRows(Array.isArray(response.data?.rows) ? response.data.rows : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || requestError.message || 'Unable to load chapter points overview.');
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [allowed, headers, query, status]);

  if (!allowed) {
    return (
      <AppScreen scroll>
        <Notice tone="warning" text="You do not have permission to access chapter-wide points overview." />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <ScreenHero eyebrow="Executive tracking" title="Points overview" description="This screen mirrors the website's executive points dashboard with mobile-friendly filters and member summaries." />

      <InfoBlock title="Filters" detail="Search by member name or narrow by status.">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search members"
          placeholderTextColor="#8b796d"
          className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink"
        />
        <View className="mt-3 flex-row flex-wrap gap-2">
          {statuses.map((statusOption) => {
            const selected = statusOption === status;
            return (
              <Pressable
                key={statusOption}
                onPress={() => setStatus(statusOption)}
                className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{statusOption}</Text>
              </Pressable>
            );
          })}
        </View>
      </InfoBlock>

      {loading ? <Text className="text-base text-muted">Loading overview...</Text> : null}
      {error ? <Notice tone="warning" text={error} /> : null}

      <InfoBlock title="Members" detail="Each row includes total points and whether chapter requirements are met.">
        {rows.length ? rows.map((row) => (
          <ListItem
            key={row.userId}
            title={`${row.firstName} ${row.lastName}`.trim() || 'Member'}
            detail={`Total: ${row.totals?.total || 0} • Extra: ${row.totals?.any || 0} • Status: ${(row.memberStatus || []).join(', ') || 'n/a'}`}
            rightText={row.requirements?.metAll ? 'Met' : 'Open'}
          />
        )) : <Text className="text-base text-muted">No members found for the current filter.</Text>}
      </InfoBlock>
    </AppScreen>
  );
}
