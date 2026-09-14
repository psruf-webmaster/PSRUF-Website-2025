import { Linking } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { ActionRow, BulletList, InfoBlock, ScreenHero } from '../../src/components/MobileUI';

export default function PartnersScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Community partners"
        title="Building impact together."
        description="This page mirrors the website's partnership story and creates a mobile path for sponsorship and community collaboration."
      >
        <ActionRow
          primaryLabel="Contact the chapter"
          onPrimaryPress={() => Linking.openURL('mailto:psruf.vpmembership@gmail.com')}
        />
      </ScreenHero>

      <InfoBlock title="Local impact" detail="Phi Sigma Rho partners with initiatives that reflect the chapter's values around service, community, and women in STEM." />
      <InfoBlock title="Shared mission" detail="Collaborations can support philanthropy, recruitment, outreach, and broader professional development opportunities." />
      <InfoBlock title="Open to partnerships" detail="The mobile app can later grow into sponsorship inquiry forms and event-specific partner spotlights.">
        <BulletList items={[
          'Women in STEM programming',
          'Service and philanthropy partnerships',
          'Recruitment and professional development collaborations',
        ]} />
      </InfoBlock>
    </AppScreen>
  );
}
