import { Image, Pressable, Text, View } from 'react-native';
import { AppScreen, Card } from '../../../src/components/AppScreen';
import { useAuth } from '../../../src/context/AuthContext';

export default function ProfileScreen() {
  const { logout, user } = useAuth();

  return (
    <AppScreen scroll>
      <Card className="items-center gap-4">
        {user?.profilePicUrl ? (
          <Image source={{ uri: user.profilePicUrl }} className="h-24 w-24 rounded-full" />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#ead7c8]">
            <Text className="text-2xl font-semibold text-accent">
              {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'PS'}
            </Text>
          </View>
        )}
        <Text className="text-2xl font-semibold text-ink">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Member profile'}</Text>
        <Text className="text-base text-muted">{user?.personalEmail || 'No email available'}</Text>
      </Card>

      <Card className="gap-3">
        <Text className="text-lg font-semibold text-ink">Membership details</Text>
        <Text className="text-base text-muted">Year: {user?.year || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Major: {user?.major || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Phone: {user?.phoneNumber || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Approval: {user?.approvalState || (user?.isApproved ? 'approved' : 'pending')}</Text>
      </Card>

      <Pressable onPress={logout} className="rounded-full bg-accent px-5 py-4">
        <Text className="text-center text-base font-semibold text-white">Log out</Text>
      </Pressable>
    </AppScreen>
  );
}
