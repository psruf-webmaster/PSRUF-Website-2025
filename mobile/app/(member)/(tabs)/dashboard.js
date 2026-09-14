import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AppScreen, Card } from '../../../src/components/AppScreen';
import { getApiOrigin } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import { canAccessAdminUsers, canAccessApprovals, canAccessLedger, canAccessPointsOverview } from '../../../src/lib/access';

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function DashboardScreen() {
  const { refreshUser, user } = useAuth();

  const roles = normalizeList(user?.role).map((role) => String(role).toUpperCase());
  const statuses = normalizeList(user?.memberStatus);
  const positions = normalizeList(user?.positions).map((position) => position?.label || position?.title || position?.key).filter(Boolean);
  const memberRoutes = [
    { href: '/(member)/points', title: 'My points', detail: 'Track requirements and recent point entries.' },
    { href: '/(member)/bylaws', title: 'Bylaws', detail: 'Chapter standards and governance references.' },
  ];
  const officerRoutes = [
    canAccessPointsOverview(user) ? { href: '/(member)/points-overview', title: 'Points overview', detail: 'Chapter-wide points tracking.' } : null,
    canAccessLedger(user) ? { href: '/(member)/ledger', title: 'Ledger', detail: 'Recent chapter point ledger entries.' } : null,
    canAccessApprovals(user) ? { href: '/(member)/admin/approvals', title: 'Approvals', detail: 'Pending account review queue.' } : null,
    canAccessAdminUsers(user) ? { href: '/(member)/admin/users', title: 'Admin users', detail: 'Read-only mobile roster for chapter accounts.' } : null,
  ].filter(Boolean);

  return (
    <AppScreen scroll>
      <Card className="gap-4">
        <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Member dashboard</Text>
        <Text className="text-3xl font-semibold text-ink">{user?.firstName ? `Welcome back, ${user.firstName}.` : 'Welcome back.'}</Text>
        <Text className="text-base leading-7 text-muted">
          This tab is already backed by the same authenticated user payload as the website, so role and status changes made by officers can flow into mobile without a parallel user model.
        </Text>
        <Pressable onPress={refreshUser} className="self-start rounded-full bg-accent px-5 py-3">
          <Text className="text-sm font-semibold text-white">Refresh profile</Text>
        </Pressable>
      </Card>

      <Card className="gap-3">
        <Text className="text-lg font-semibold text-ink">Account snapshot</Text>
        <Text className="text-base text-muted">Email: {user?.personalEmail || 'Unavailable'}</Text>
        <Text className="text-base text-muted">UF email: {user?.ufEmail || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Roles: {roles.length ? roles.join(', ') : 'None assigned'}</Text>
        <Text className="text-base text-muted">Statuses: {statuses.length ? statuses.join(', ') : 'None assigned'}</Text>
        <Text className="text-base text-muted">Positions: {positions.length ? positions.join(', ') : 'No officer positions'}</Text>
      </Card>

      <Card className="gap-3">
        <Text className="text-lg font-semibold text-ink">Chapter pages</Text>
        {memberRoutes.map((route) => (
          <Link key={route.href} href={route.href} asChild>
            <Pressable className="rounded-[24px] border border-line bg-white px-4 py-4">
              <Text className="text-base font-semibold text-ink">{route.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">{route.detail}</Text>
            </Pressable>
          </Link>
        ))}
      </Card>

      {officerRoutes.length ? (
        <Card className="gap-3">
          <Text className="text-lg font-semibold text-ink">Officer tools</Text>
          {officerRoutes.map((route) => (
            <Link key={route.href} href={route.href} asChild>
              <Pressable className="rounded-[24px] border border-line bg-white px-4 py-4">
                <Text className="text-base font-semibold text-ink">{route.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">{route.detail}</Text>
              </Pressable>
            </Link>
          ))}
        </Card>
      ) : null}

      <View className="flex-row gap-4">
        <View className="flex-1 rounded-[28px] border border-line bg-[#efe0d4] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-accent">Backend</Text>
          <Text className="mt-2 text-base leading-6 text-ink">{getApiOrigin()}</Text>
        </View>
        <View className="flex-1 rounded-[28px] border border-line bg-[#f4e8dd] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-accent">Storage</Text>
          <Text className="mt-2 text-base leading-6 text-ink">Expo SecureStore keeps the cached user session local to the device.</Text>
        </View>
      </View>
    </AppScreen>
  );
}
