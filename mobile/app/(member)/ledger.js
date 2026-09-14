import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { InfoBlock, ListItem, Notice, ScreenHero } from '../../src/components/MobileUI';
import { useAuth } from '../../src/context/AuthContext';
import { api, authHeaders } from '../../src/lib/api';
import { canAccessLedger } from '../../src/lib/access';

function formatEntry(entry) {
  const name = `${entry?.user?.firstName || ''} ${entry?.user?.lastName || ''}`.trim() || 'Member';
  const source = entry?.source || 'manual';
  return `${name} • ${source}`;
}

export default function LedgerScreen() {
  const { user } = useAuth();
  const allowed = canAccessLedger(user);
  const headers = useMemo(() => authHeaders(user), [user]);
  const [entries, setEntries] = useState([]);
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
        const response = await api.get('/ledger', {
          headers,
          params: { limit: 25 },
        });
        if (!cancelled) {
          setEntries(Array.isArray(response.data?.entries) ? response.data.entries : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || requestError.message || 'Unable to load ledger.');
          setEntries([]);
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
  }, [allowed, headers]);

  if (!allowed) {
    return (
      <AppScreen scroll>
        <Notice tone="warning" text="You do not have permission to access the chapter ledger." />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <ScreenHero eyebrow="Standards and finance" title="Ledger" description="This mobile ledger page lists the latest chapter point entries using the same admin ledger endpoint as the website." />
      {loading ? <Text className="text-base text-muted">Loading ledger...</Text> : null}
      {error ? <Notice tone="warning" text={error} /> : null}
      <InfoBlock title="Latest entries" detail="Recent chapter point activity.">
        {entries.length ? entries.map((entry) => (
          <ListItem
            key={entry._id}
            title={`${entry.points} points • ${(entry.category || 'general').toUpperCase()}`}
            detail={`${formatEntry(entry)}${entry.event?.title ? ` • ${entry.event.title}` : ''}`}
            rightText={entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
          />
        )) : <Text className="text-base text-muted">No ledger entries found.</Text>}
      </InfoBlock>
    </AppScreen>
  );
}
