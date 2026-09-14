import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen, Card } from '../../src/components/AppScreen';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { error, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit() {
    if (!email || !password) {
      setLocalError('Enter your email and password.');
      return;
    }

    setLocalError('');

    try {
      await login(email.trim(), password);
      router.replace('/(member)/(tabs)/dashboard');
    } catch (_error) {
    }
  }

  return (
    <AppScreen scroll>
      <Card className="gap-5">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Member access</Text>
          <Text className="mt-3 text-3xl font-semibold text-ink">Sign in with your existing website account.</Text>
          <Text className="mt-3 text-base leading-6 text-muted">No backend changes are needed here. This screen calls the same `/api/auth/login` endpoint your web client already uses.</Text>
        </View>

        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink">Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#8b796d"
              value={email}
              className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink"
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-ink">Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8b796d"
              secureTextEntry
              value={password}
              className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink"
            />
          </View>
        </View>

        {localError ? <Text className="text-sm text-warning">{localError}</Text> : null}
        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={loading}
          className={`rounded-full px-5 py-4 ${loading ? 'bg-accent/60' : 'bg-accent'}`}
        >
          <Text className="text-center text-base font-semibold text-white">{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>

        <Link href="/(public)/welcome" asChild>
          <Pressable className="rounded-full border border-line px-5 py-4">
            <Text className="text-center text-base font-semibold text-ink">Back to overview</Text>
          </Pressable>
        </Link>
      </Card>
    </AppScreen>
  );
}
