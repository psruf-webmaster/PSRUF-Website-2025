import { Redirect, Slot } from 'expo-router';
import { FullScreenMessage } from '../../src/components/AppScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function PublicLayout() {
  const { hydrated, user } = useAuth();

  if (!hydrated) {
    return <FullScreenMessage title="Loading app" detail="Preparing the public experience." />;
  }

  if (user) {
    return <Redirect href="/(member)/(tabs)/dashboard" />;
  }

  return <Slot />;
}
