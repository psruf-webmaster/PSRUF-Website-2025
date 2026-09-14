import { Redirect, Slot } from 'expo-router';
import { FullScreenMessage } from '../../src/components/AppScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function AuthLayout() {
  const { hydrated, user } = useAuth();

  if (!hydrated) {
    return <FullScreenMessage title="Loading app" detail="Preparing sign-in." />;
  }

  if (user) {
    return <Redirect href="/(member)/(tabs)/dashboard" />;
  }

  return <Slot />;
}
