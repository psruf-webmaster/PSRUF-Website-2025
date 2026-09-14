import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../../src/components/AppScreen';
import { ChoiceChips, InfoBlock, Notice, ScreenHero } from '../../../src/components/MobileUI';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';
import { canAccessApprovals } from '../../../src/lib/access';
import { allPositionOptions, memberStatusOptions, roleOptions, scholarshipOptions } from '../../../src/lib/adminOptions';

export default function AdminApprovalsScreen() {
  const { user } = useAuth();
  const allowed = canAccessApprovals(user);
  const headers = useMemo(() => authHeaders(user), [user]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState({});

  function toggleMulti(id, key, value) {
    setDrafts((current) => {
      const selected = current[id]?.[key] || [];
      const nextValues = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [id]: { ...current[id], [key]: nextValues } };
    });
  }

  function setScholarship(id, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], scholarship: value } }));
  }

  function setReason(id, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], reason: value } }));
  }

  function canManageScholarship() {
    return Array.isArray(user?.positions) && user.positions.some((position) => position?.key === 'VP_FINANCE');
  }

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
        const response = await api.get('/admin/pending', { headers });
        if (!cancelled) {
          const nextUsers = Array.isArray(response.data) ? response.data : [];
          setPendingUsers(nextUsers);
          const nextDrafts = {};
          nextUsers.forEach((pendingUser) => {
            nextDrafts[pendingUser._id] = {
              role: [],
              memberStatus: [],
              positions: [],
              scholarship: Number(pendingUser.scholarship ?? 0),
              reason: '',
            };
          });
          setDrafts(nextDrafts);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || requestError.message || 'Unable to load approvals queue.');
          setPendingUsers([]);
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
        <Notice tone="warning" text="You do not have permission to access pending approvals." />
      </AppScreen>
    );
  }

  async function approveUser(id) {
    setError('');
    setMessage('');

    try {
      const draft = drafts[id] || {};
      const body = {
        role: draft.role || [],
        memberStatus: draft.memberStatus || [],
        positions: draft.positions || [],
      };

      if (canManageScholarship()) {
        body.scholarship = Number(draft.scholarship ?? 0);
      }

      const response = await api.patch(`/admin/approve/${id}`, body, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      setMessage(response.data?.message || 'Approved.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to approve user.');
    }
  }

  async function rejectUser(id) {
    setError('');
    setMessage('');

    try {
      const draft = drafts[id] || {};
      const reason = draft.reason ? `?reason=${encodeURIComponent(draft.reason)}` : '';
      const response = await api.delete(`/admin/reject/${id}${reason}`, { headers });
      setMessage(response.data?.message || 'Rejected.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to reject user.');
    }
  }

  return (
    <AppScreen scroll>
      <ScreenHero eyebrow="Webmaster tools" title="Pending approvals" description="This page mirrors the approval queue on the website and surfaces pending member applications on mobile." />
      {loading ? <Text className="text-base text-muted">Loading pending approvals...</Text> : null}
      {error ? <Notice tone="warning" text={error} /> : null}
      {message ? <Notice text={message} /> : null}
      <InfoBlock title="Queue" detail="Review applicants and assign roles, statuses, positions, and scholarship before approval.">
        {pendingUsers.length ? pendingUsers.map((pendingUser) => (
          <View key={pendingUser._id} className="rounded-[24px] border border-line bg-white p-4">
            <Text className="text-lg font-semibold text-ink">{`${pendingUser.firstName || ''} ${pendingUser.lastName || ''}`.trim() || 'Pending user'}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{pendingUser.personalEmail || 'No email'} • {pendingUser.major || 'No major'} • {pendingUser.year || 'No year'}</Text>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Roles</Text>
              <ChoiceChips options={roleOptions} selectedValues={drafts[pendingUser._id]?.role || []} onToggle={(value) => toggleMulti(pendingUser._id, 'role', value)} />
            </View>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Member status</Text>
              <ChoiceChips options={memberStatusOptions} selectedValues={drafts[pendingUser._id]?.memberStatus || []} onToggle={(value) => toggleMulti(pendingUser._id, 'memberStatus', value)} />
            </View>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Positions</Text>
              <ChoiceChips options={allPositionOptions} selectedValues={drafts[pendingUser._id]?.positions || []} onToggle={(value) => toggleMulti(pendingUser._id, 'positions', value)} />
            </View>

            {canManageScholarship() ? (
              <View className="mt-4 gap-2">
                <Text className="text-sm font-semibold text-ink">Scholarship</Text>
                <ChoiceChips options={scholarshipOptions.map((value) => ({ label: `${value}%`, value }))} selectedValues={drafts[pendingUser._id]?.scholarship} onToggle={(value) => setScholarship(pendingUser._id, value)} multi={false} />
              </View>
            ) : null}

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Reject reason</Text>
              <TextInput value={drafts[pendingUser._id]?.reason || ''} onChangeText={(value) => setReason(pendingUser._id, value)} placeholder="Optional reason" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-card px-4 py-4 text-base text-ink" />
            </View>

            <View className="mt-4 flex-row gap-3">
              <Pressable onPress={() => approveUser(pendingUser._id)} className="rounded-full bg-accent px-5 py-3">
                <Text className="text-sm font-semibold text-white">Approve</Text>
              </Pressable>
              <Pressable onPress={() => rejectUser(pendingUser._id)} className="rounded-full border border-line bg-card px-5 py-3">
                <Text className="text-sm font-semibold text-ink">Reject</Text>
              </Pressable>
            </View>
          </View>
        )) : <Text className="text-base text-muted">No pending approvals right now.</Text>}
      </InfoBlock>
    </AppScreen>
  );
}
