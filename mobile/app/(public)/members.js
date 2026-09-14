import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { BulletList, ScreenHero, InfoBlock } from '../../src/components/MobileUI';

export default function MembersScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Member access"
        title="Chapter tools live here."
        description="The web Members page is currently minimal. On mobile, this becomes a clear gateway into the authenticated dashboard, feeds, points, events, and admin tools."
      >
        <Link href="/(auth)/login" asChild>
          <Pressable className="self-start rounded-full bg-accent px-5 py-3">
            <Text className="text-sm font-semibold text-white">Sign in</Text>
          </Pressable>
        </Link>
      </ScreenHero>

      <InfoBlock title="What members get" detail="Once signed in, members can access the same backend-backed data you already expose on the website.">
        <BulletList items={[
          'Personal dashboard and role-aware chapter information',
          'Events, RSVP status, and event details',
          'Realtime feeds and channel posts',
          'Points, ledger history, and officer/admin tools where authorized',
        ]} />
      </InfoBlock>
    </AppScreen>
  );
}
