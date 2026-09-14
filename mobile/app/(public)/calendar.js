import { Linking } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { ActionRow, InfoBlock, ScreenHero } from '../../src/components/MobileUI';

const calendarUrl = 'https://calendar.google.com/calendar/embed?src=psruf.webmaster%40gmail.com&ctz=America%2FNew_York';

export default function CalendarScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Chapter events"
        title="Calendar"
        description="On web this page embeds the Google Calendar. On mobile, the cleanest first version is to launch the chapter calendar directly in the device browser or Google Calendar app."
      >
        <ActionRow primaryLabel="Open calendar" onPrimaryPress={() => Linking.openURL(calendarUrl)} />
      </ScreenHero>

      <InfoBlock title="Upcoming events" detail="Use the member Events tab for authenticated event visibility and RSVP functionality. The public calendar remains the chapter-wide schedule view." />
    </AppScreen>
  );
}
