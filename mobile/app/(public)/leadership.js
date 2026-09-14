import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { BulletList, InfoBlock, ScreenHero, SectionTitle } from '../../src/components/MobileUI';
import { leadershipTerms } from '../../src/lib/content';

const terms = Object.keys(leadershipTerms).sort().reverse();

export default function LeadershipScreen() {
  const [selectedTerm, setSelectedTerm] = useState('2026-2027');
  const leaders = leadershipTerms[selectedTerm] || [];

  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Executive board"
        title="Meet our leaders"
        description="The mobile app mirrors the website's leadership page with term-based officer rosters and direct chapter contact links."
      />

      <SectionTitle title="Choose a term" detail="Switch between recent leadership boards." />
      <View className="flex-row flex-wrap gap-3">
        {terms.map((term) => {
          const selected = term === selectedTerm;
          return (
            <Pressable
              key={term}
              onPress={() => setSelectedTerm(term)}
              className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
            >
              <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{term}</Text>
            </Pressable>
          );
        })}
      </View>

      {leaders.map((leader) => (
        <InfoBlock
          key={`${selectedTerm}-${leader.name}`}
          title={leader.name}
          detail={leader.title}
        >
          <BulletList items={[leader.email, leader.linkedin]} />
          <View className="mt-2 flex-row gap-3">
            <Pressable onPress={() => Linking.openURL(`mailto:${leader.email}`)} className="rounded-full bg-accent px-4 py-3">
              <Text className="text-sm font-semibold text-white">Email</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(leader.linkedin)} className="rounded-full border border-line bg-card px-4 py-3">
              <Text className="text-sm font-semibold text-ink">LinkedIn</Text>
            </Pressable>
          </View>
        </InfoBlock>
      ))}
    </AppScreen>
  );
}
