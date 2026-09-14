import { Redirect } from 'expo-router';
import { FullScreenMessage } from '../src/components/AppScreen';
import { useAuth } from '../src/context/AuthContext';

export default function IndexPage() {
  const { hydrated, user } = useAuth();

  if (!hydrated) {
    return <FullScreenMessage title="Loading app" detail="Checking your saved session and routing you to the right space." />;
  }

  return <Redirect href={user ? '/(member)/(tabs)/dashboard' : '/(public)/welcome'} />;
}
