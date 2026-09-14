import { Redirect, Slot } from 'expo-router';
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

  return <Slot />;
}
