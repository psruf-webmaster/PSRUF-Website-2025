import { Linking } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { ActionRow, BulletList, InfoBlock, ScreenHero } from '../../src/components/MobileUI';

export default function AlumniScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Alumnae network"
        title="Graduation is just the beginning."
        description="The alumni page is translated into a mobile-native format focused on staying connected, celebrating milestones, and maintaining lifelong sisterhood."
      >
        <ActionRow
          primaryLabel="Stay in touch"
          onPrimaryPress={() => Linking.openURL('mailto:psrufalumnae@gmail.com')}
        />
      </ScreenHero>

      <InfoBlock title="Why alumni stay engaged" detail="The website emphasizes that the chapter support system does not end at graduation.">
        <BulletList items={[
          'Reunions, conventions, and chapter gatherings across the network.',
          'Career support and networking with sisters across industries.',
          'Shared milestones, traditions, and chapter updates beyond UF.',
        ]} />
      </InfoBlock>

      <InfoBlock title="Ways to reconnect" detail="A mobile-friendly alumni experience can grow into event registration, newsletters, and dedicated alumnae channels next.">
        <BulletList items={[
          'Email the alumnae contact to update your information.',
          'Join chapter updates and future alumni-specific feed spaces.',
          'Share professional and personal milestones back with the chapter.',
        ]} />
      </InfoBlock>
    </AppScreen>
  );
}
