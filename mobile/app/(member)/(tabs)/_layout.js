import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function MemberTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7b2226',
        tabBarInactiveTintColor: '#8b796d',
        tabBarStyle: {
          backgroundColor: '#fff8f2',
          borderTopColor: '#e8d7c8',
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconByRoute = {
            dashboard: focused ? 'sparkles' : 'sparkles-outline',
            events: focused ? 'calendar' : 'calendar-outline',
            feed: focused ? 'chatbubbles' : 'chatbubbles-outline',
            profile: focused ? 'person-circle' : 'person-circle-outline',
          };

          return <Ionicons name={iconByRoute.dashboard} color={color} size={size} />;
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={size} /> }} />
    </Tabs>
  );
}
