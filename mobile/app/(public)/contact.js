import { Linking, Pressable, Text, View } from 'react-native';
import { AppScreen } from '../../src/components/AppScreen';
import { InfoBlock, ScreenHero } from '../../src/components/MobileUI';

export default function ContactScreen() {
  return (
    <AppScreen scroll>
      <ScreenHero
        eyebrow="Contact us"
        title="We'd love to hear from you."
        description="Whether you are a prospective member, alumna, or partner, this mobile page keeps the same chapter contact paths as the website."
      />

      <InfoBlock title="Membership" detail="psruf.vpmembership@gmail.com">
        <Pressable onPress={() => Linking.openURL('mailto:psruf.vpmembership@gmail.com')} className="self-start rounded-full bg-accent px-4 py-3">
          <Text className="text-sm font-semibold text-white">Email membership</Text>
        </Pressable>
      </InfoBlock>

      <InfoBlock title="Location" detail="PO Box 58304, Gainesville, FL 32611" />

      <InfoBlock title="Webmaster" detail="psruf.webmaster@gmail.com">
        <View className="flex-row gap-3">
          <Pressable onPress={() => Linking.openURL('mailto:psruf.webmaster@gmail.com?subject=Bug%20Report')} className="rounded-full border border-line bg-card px-4 py-3">
            <Text className="text-sm font-semibold text-ink">Report a bug</Text>
          </Pressable>
        </View>
      </InfoBlock>
    </AppScreen>
  );
}
