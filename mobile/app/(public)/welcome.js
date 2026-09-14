import { MotiView } from 'moti';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AppScreen, Card } from '../../src/components/AppScreen';
import { LinkCard } from '../../src/components/MobileUI';
import { chapterHighlights, publicExploreLinks } from '../../src/lib/content';

const features = [
  {
    title: 'Same backend',
    detail: 'Connects to the existing Express, MongoDB, and Cloudinary stack.',
  },
  {
    title: 'Member auth',
    detail: 'Uses the current login and user refresh endpoints with secure local storage.',
  },
  {
    title: 'Realtime feeds',
    detail: 'Ready for Socket.IO room joins so channel updates stay live on mobile.',
  },
];

export default function WelcomeScreen() {
  return (
    <AppScreen scroll>
      <MotiView
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        className="gap-4"
      >
        <View className="rounded-[32px] border border-line bg-card p-6">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">PSRUF Mobile</Text>
          <Text className="mt-3 text-4xl font-semibold leading-tight text-ink">A native member app on the same API and database.</Text>
          <Text className="mt-4 text-base leading-7 text-muted">
            This Expo app mirrors the website's public, auth, and member areas so the mobile build can grow beside the existing client without changing backend contracts.
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Link href="/(auth)/login" asChild>
              <Pressable className="rounded-full bg-accent px-5 py-3">
                <Text className="text-sm font-semibold text-white">Member login</Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/signup" asChild>
              <Pressable className="rounded-full border border-line bg-card px-5 py-3">
                <Text className="text-sm font-semibold text-ink">Apply now</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </MotiView>

      <View className="flex-row flex-wrap gap-3">
        {chapterHighlights.map((item) => (
          <View key={item.label} className="min-w-[140px] flex-1 rounded-[24px] border border-line bg-[#f3e2d6] p-4">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-accent">{item.label}</Text>
            <Text className="mt-2 text-2xl font-semibold text-ink">{item.value}</Text>
          </View>
        ))}
      </View>

      {features.map((feature, index) => (
        <MotiView
          key={feature.title}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 120 + index * 120 }}
        >
          <Card>
            <Text className="text-lg font-semibold text-ink">{feature.title}</Text>
            <Text className="mt-2 text-base leading-6 text-muted">{feature.detail}</Text>
          </Card>
        </MotiView>
      ))}

      <View className="gap-3">
        <Text className="text-2xl font-semibold text-ink">Explore the chapter</Text>
        {publicExploreLinks.map((item) => (
          <LinkCard key={item.href} href={item.href} title={item.title} detail={item.detail} />
        ))}
      </View>
    </AppScreen>
  );
}
