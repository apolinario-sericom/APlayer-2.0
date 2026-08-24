import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useAPlayerTheme } from "@/lib/aplayer-theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { palette } = useAPlayerTheme();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.faint,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: palette.background,
          borderTopColor: palette.line,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color }) => <MaterialIcons name="home-filled" size={24} color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: "Biblioteca", tabBarIcon: ({ color }) => <MaterialIcons name="library-music" size={24} color={color} /> }} />
      <Tabs.Screen name="playlists" options={{ title: "Playlists", tabBarIcon: ({ color }) => <MaterialIcons name="queue-music" size={24} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} /> }} />
    </Tabs>
  );
}
