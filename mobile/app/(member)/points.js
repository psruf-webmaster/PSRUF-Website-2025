import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { InfoBlock, ListItem, Notice, ScreenHero, StatRow } from '../../src/components/MobileUI';
import { useAuth } from '../../src/context/AuthContext';
import { api, authHeaders } from '../../src/lib/api';
import { canAccessPointsOverview, isAlumniUser } from '../../src/lib/access';

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No date';
  }
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PointsScreen() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = useMemo(() => authHeaders(user), [user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [requirementsResponse, entriesResponse] = await Promise.all([
          api.get('/requirements/active/self', { headers }),
          api.get('/ledger/entries/self', { headers, params: { limit: 25 } }),
        ]);

        if (cancelled) {
          return;
        }

        setRequirements(requirementsResponse.data || null);
        setEntries(Array.isArray(entriesResponse.data?.entries) ? entriesResponse.data.entries : []);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || requestError.message || 'Unable to load points.');
          setRequirements(null);
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
  }, [headers, user]);

  const totals = requirements?.totals || {};
  const anyBucket = requirements?.any || {};
  const requirementsMeta = requirements?.requirements || {};
  const alumni = isAlumniUser(user);

  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Personal progress"
        title="My points"
        description="This screen brings over the website's self-service point tracking using the same requirements and ledger endpoints."
      />

      {error ? <Notice tone="warning" text={error} /> : null}
      {alumni ? <Notice text="Alumni members do not currently have active point requirements." /> : null}
      {loading ? <Text className="text-base text-muted">Loading points...</Text> : null}

      {!loading && requirements ? (
        <StatRow
          items={[
            { label: 'Phi', value: String(totals.phi || 0) },
            { label: 'Sigma', value: String(totals.sigma || 0) },
            { label: 'Rho', value: String(totals.rho || 0) },
            { label: 'Tau', value: String(totals.tau || 0) },
            { label: 'Extra', value: String(anyBucket.have || 0) },
            { label: 'Total', value: String(totals.total || 0) },
          ]}
        />
      ) : null}

      {requirementsMeta ? (
        <InfoBlock
          title="Requirement summary"
          detail={requirementsMeta.rule === 'anywhere'
            ? `${requirementsMeta.totalRequired || 50} points required anywhere`
            : requirementsMeta.rule === 'none'
              ? 'No active requirement for your current status'
              : `${requirementsMeta.minPerCategory || 50} points per bucket plus extra points`}
        />
      ) : null}

      {canAccessPointsOverview(user) ? (
        <InfoBlock title="Officer tools" detail="Your role includes access to the chapter-wide points overview page in mobile." />
      ) : null}

      <InfoBlock title="Recent point entries" detail="Latest ledger entries credited to your account.">
        {entries.length ? entries.map((entry) => (
          <ListItem
            key={entry._id}
            title={`${entry.points} points • ${(entry.category || 'general').toUpperCase()}`}
            detail={`${entry.eventTitle || entry.note || 'Manual or attendance credit'} • ${formatDate(entry.createdAt)}`}
            rightText={entry.source || 'entry'}
          />
        )) : <Text className="text-base text-muted">No point entries yet.</Text>}
      </InfoBlock>
    </AppScreen>
  );
}
