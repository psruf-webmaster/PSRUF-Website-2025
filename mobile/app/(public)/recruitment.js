import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { ActionRow, BulletList, InfoBlock, ScreenHero, SectionTitle } from '../../src/components/MobileUI';
import { api, getApiOrigin } from '../../src/lib/api';
import { normalizeAssetUrl } from '../../src/lib/assetUrls';
import { recruitmentMajors } from '../../src/lib/content';

function formatEventDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date coming soon';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function RecruitmentScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await api.get('/events/public/pnm');
        if (!cancelled) {
          setEvents(Array.isArray(response.data) ? response.data : []);
        }
      } catch (_error) {
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Spring recruitment"
        title="Engineering is tough. Finding your friends shouldn't be."
        description="This mobile page carries the same recruitment message as the website and pulls the public PNM events feed directly from the backend."
      >
        <ActionRow
          primaryLabel="Join our email list"
          onPrimaryPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLSd7XzAEOR7hOqxU3NOFY9df0ZQFcPGI5LPeSI1pW3jQLo4aXg/viewform')}
          secondaryLabel="Email membership"
          onSecondaryPress={() => Linking.openURL('mailto:psruf.vpmembership@gmail.com')}
        />
      </ScreenHero>

      <InfoBlock title="A personal welcome" detail="Phi Sigma Rho is designed for women in engineering and STEM who want a support system that understands the pace and pressure of technical majors.">
        <BulletList items={[
          'Scholarship support and accountability in demanding coursework.',
          'A social sisterhood built around women in engineering and STEM.',
          'Recruitment events that introduce you to the chapter before commitment.',
        ]} />
      </InfoBlock>

      <SectionTitle title="Upcoming rush events" detail="These cards come from the same public events endpoint as the website." />
      {loading ? <Text className="text-base text-muted">Loading recruitment events...</Text> : null}
      {!loading && !events.length ? <InfoBlock title="No events posted yet" detail="Check back soon for open socials and rush dates." /> : null}
      {events.map((eventItem) => {
        const imageUrl = normalizeAssetUrl(eventItem.imageUrl) || (eventItem.imageUrl && eventItem.imageUrl.startsWith('http') ? eventItem.imageUrl : '');
        return (
          <InfoBlock
            key={eventItem._id}
            title={eventItem.title || 'Rush event'}
            detail={`${formatEventDate(eventItem.startAt)}${eventItem.location ? ` • ${eventItem.location}` : ''}`}
          >
            <Text className="text-base leading-6 text-muted">{eventItem.description || 'Open social details coming soon.'}</Text>
            {imageUrl ? <Text className="text-sm text-muted">Image: {imageUrl.replace(getApiOrigin(), '')}</Text> : null}
          </InfoBlock>
        );
      })}

      <InfoBlock title="Accepted majors" detail="These are the same academic tracks listed on the website recruitment page.">
        <BulletList items={recruitmentMajors} />
      </InfoBlock>
    </AppScreen>
  );
}
