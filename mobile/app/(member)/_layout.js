import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack } from 'expo-router';
import { FullScreenMessage } from '../../src/components/AppScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function MemberLayout() {
  const { hydrated, user } = useAuth();

  if (!hydrated) {
    return <FullScreenMessage title="Loading app" detail="Restoring your member session." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff8f2' },
        headerTintColor: '#2c1f17',
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#f7efe8' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="bylaws" options={{ title: 'Bylaws' }} />
      <Stack.Screen name="points" options={{ title: 'My Points' }} />
      <Stack.Screen name="points-overview" options={{ title: 'Points Overview' }} />
      <Stack.Screen name="ledger" options={{ title: 'Ledger' }} />
      <Stack.Screen name="events/[eventId]" options={{ title: 'Event Details' }} />
      <Stack.Screen name="admin/approvals" options={{ title: 'Approvals' }} />
      <Stack.Screen name="admin/users" options={{ title: 'Admin Users' }} />
    </Stack>
  );
}
