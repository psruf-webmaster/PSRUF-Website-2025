import { Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppScreen({ children, scroll = false }) {
  const content = scroll ? (
    <ScrollView
      className="flex-1 bg-shell"
      contentContainerStyle={{ padding: 24, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 bg-shell px-6 py-6">{children}</View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-shell">
      {content}
    </SafeAreaView>
  );
}

export function FullScreenMessage({ title, detail }) {
  return (
    <AppScreen>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <View className="rounded-full border border-line bg-card px-3 py-1">
          <Text className="text-xs font-medium uppercase tracking-[2px] text-muted">PSRUF Mobile</Text>
        </View>
        <Text className="text-2xl font-semibold text-ink">{title}</Text>
        {detail ? <Text className="text-center text-base leading-6 text-muted">{detail}</Text> : null}
      </View>
    </AppScreen>
  );
}

export function Card({ children, className = '' }) {
  return <View className={`rounded-[28px] border border-line bg-card p-5 ${className}`}>{children}</View>;
}
