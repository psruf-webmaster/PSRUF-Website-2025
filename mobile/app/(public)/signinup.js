import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { InfoBlock, ScreenHero } from '../../src/components/MobileUI';

export default function SignInUpScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Get started"
        title="Join the chapter or return to your account."
        description="This mirrors the website's sign-in/sign-up decision page and routes into the appropriate mobile auth screen."
      >
        <View className="flex-row gap-3">
          <Link href="/(auth)/signup" asChild>
            <Pressable className="rounded-full bg-accent px-5 py-3">
              <Text className="text-sm font-semibold text-white">Sign up</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/login" asChild>
            <Pressable className="rounded-full border border-line bg-card px-5 py-3">
              <Text className="text-sm font-semibold text-ink">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenHero>

      <InfoBlock title="New members" detail="Create an account with the same information required on the website, then wait for chapter approval." />
      <InfoBlock title="Returning members" detail="Use your existing website credentials. Auth state is shared through the same backend and database." />
    </AppScreen>
  );
}
