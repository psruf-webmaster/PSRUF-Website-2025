import { AppScreen } from '../../src/components/AppScreen';
import { BulletList, InfoBlock, ScreenHero } from '../../src/components/MobileUI';

export default function BylawsScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Chapter standards"
        title="Bylaws"
        description="The website exposes bylaws inside the member area. This mobile version starts as a standards and expectations screen and can later attach the full document or searchable sections."
      />

      <InfoBlock title="Why this page exists" detail="Members need a predictable place for expectations, conduct, and chapter operations on mobile just like they do on the website." />

      <InfoBlock title="Core sections" detail="This starter mirrors the typical structure of the chapter bylaws page.">
        <BulletList items={[
          'Membership expectations and chapter participation rules',
          'Officer responsibilities and leadership transition norms',
          'Academic, financial, and conduct standards',
          'Voting, meetings, and chapter governance procedures',
        ]} />
      </InfoBlock>
    </AppScreen>
  );
}
