import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppScreen } from '../../../src/components/AppScreen';
import { ChoiceChips, InfoBlock, Notice, ScreenHero } from '../../../src/components/MobileUI';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';
import { canAccessAdminUsers } from '../../../src/lib/access';
import { allPositionOptions, memberStatusOptions, roleOptions, scholarshipOptions } from '../../../src/lib/adminOptions';

const stateOptions = ['all', 'pending', 'approved', 'rejected'];

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const allowed = canAccessAdminUsers(user);
  const headers = useMemo(() => authHeaders(user), [user]);
  const [state, setState] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState({});

  function canManageScholarship() {
    return Array.isArray(user?.positions) && user.positions.some((position) => position?.key === 'VP_FINANCE');
  }

  function toggleMulti(id, key, value) {
    setDrafts((current) => {
      const selected = current[id]?.[key] || [];
      const nextValues = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [id]: { ...current[id], [key]: nextValues } };
    });
  }

  function setSingle(id, key, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
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
        const response = await api.get('/admin/users', {
          headers,
          params: {
            state: state === 'all' ? undefined : state,
          },
        });

        if (!cancelled) {
          const nextUsers = Array.isArray(response.data) ? response.data : [];
          setUsers(nextUsers);
          const nextDrafts = {};
          nextUsers.forEach((currentUser) => {
            nextDrafts[currentUser._id] = {
              role: Array.isArray(currentUser.role) ? currentUser.role : [],
              memberStatus: Array.isArray(currentUser.memberStatus) ? currentUser.memberStatus : [],
              scholarship: Number(currentUser.scholarship ?? 0),
              addPositions: [],
              removePositions: [],
            };
          });
          setDrafts(nextDrafts);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || requestError.message || 'Unable to load admin users.');
          setUsers([]);
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
  }, [allowed, headers, state]);

  if (!allowed) {
    return (
      <AppScreen scroll>
        <Notice tone="warning" text="You do not have permission to access Admin Users." />
      </AppScreen>
    );
  }

  async function saveUser(id) {
    setError('');
    setMessage('');
    const draft = drafts[id] || {};

    try {
      await api.patch(`/admin/users/${id}/roles-status`, {
        role: draft.role || [],
        memberStatus: draft.memberStatus || [],
        scholarship: canManageScholarship() ? Number(draft.scholarship ?? 0) : undefined,
      }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      if ((draft.addPositions || []).length || (draft.removePositions || []).length) {
        await api.patch(`/admin/users/${id}/positions`, {
          add: draft.addPositions || [],
          remove: draft.removePositions || [],
        }, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        });
      }

      setMessage('User updated.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to save user changes.');
    }
  }

  return (
    <AppScreen scroll>
      <ScreenHero eyebrow="Admin tools" title="Admin users" description="This screen mirrors the website's approval-state user list and gives officers a mobile read view of chapter accounts." />

      <InfoBlock title="Filter by approval state" detail="Switch between all, pending, approved, and rejected users.">
        <View className="flex-row flex-wrap gap-2">
          {stateOptions.map((option) => {
            const selected = state === option;
            return (
              <Pressable
                key={option}
                onPress={() => setState(option)}
                className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </InfoBlock>

      {loading ? <Text className="text-base text-muted">Loading users...</Text> : null}
      {error ? <Notice tone="warning" text={error} /> : null}
      {message ? <Notice text={message} /> : null}
      <InfoBlock title="Users" detail="Mobile editing for roles, statuses, scholarships, and positions.">
        {users.length ? users.map((currentUser) => (
          <View key={currentUser._id} className="rounded-[24px] border border-line bg-white p-4">
            <Text className="text-lg font-semibold text-ink">{`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'User'}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{currentUser.personalEmail || 'No email'} • {currentUser.approvalState || 'unknown'}</Text>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Roles</Text>
              <ChoiceChips options={roleOptions} selectedValues={drafts[currentUser._id]?.role || []} onToggle={(value) => toggleMulti(currentUser._id, 'role', value)} />
            </View>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Member statuses</Text>
              <ChoiceChips options={memberStatusOptions} selectedValues={drafts[currentUser._id]?.memberStatus || []} onToggle={(value) => toggleMulti(currentUser._id, 'memberStatus', value)} />
            </View>

            {canManageScholarship() ? (
              <View className="mt-4 gap-2">
                <Text className="text-sm font-semibold text-ink">Scholarship</Text>
                <ChoiceChips options={scholarshipOptions.map((value) => ({ label: `${value}%`, value }))} selectedValues={drafts[currentUser._id]?.scholarship} onToggle={(value) => setSingle(currentUser._id, 'scholarship', value)} multi={false} />
              </View>
            ) : null}

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Current positions</Text>
              <ChoiceChips options={(currentUser.positions || []).map((position) => ({ label: position?.title || position?.key, value: position?.key }))} selectedValues={drafts[currentUser._id]?.removePositions || []} onToggle={(value) => toggleMulti(currentUser._id, 'removePositions', value)} />
              <Text className="text-xs text-muted">Tap a position to mark it for removal.</Text>
            </View>

            <View className="mt-4 gap-2">
              <Text className="text-sm font-semibold text-ink">Add positions</Text>
              <ChoiceChips options={allPositionOptions} selectedValues={drafts[currentUser._id]?.addPositions || []} onToggle={(value) => toggleMulti(currentUser._id, 'addPositions', value)} />
            </View>

            <Pressable onPress={() => saveUser(currentUser._id)} className="mt-4 rounded-full bg-accent px-5 py-3">
              <Text className="text-center text-sm font-semibold text-white">Save user</Text>
            </Pressable>
          </View>
        )) : <Text className="text-base text-muted">No users found for this filter.</Text>}
      </InfoBlock>
    </AppScreen>
  );
}
