import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFonts } from 'expo-font';
import { SairaCondensed_600SemiBold, SairaCondensed_700Bold } from '@expo-google-fonts/saira-condensed';
import { PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold } from '@expo-google-fonts/public-sans';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { StoreProvider, useStore } from './src/store';
import { ToastProvider } from './src/Toast';
import { fonts, useIsDark, usePalette } from './src/theme';
import Welcome from './src/Welcome';
import TodayScreen from './src/screens/TodayScreen';
import LogScreen from './src/screens/LogScreen';
import ConditionsScreen from './src/screens/ConditionsScreen';
import EvidenceScreen from './src/screens/EvidenceScreen';
import ExportScreen from './src/screens/ExportScreen';
import MoreScreen from './src/screens/MoreScreen';
import CheckupsScreen from './src/screens/CheckupsScreen';
import TakeCheckupScreen from './src/screens/TakeCheckupScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { LockGate } from './src/Lock';
import type { MoreStack } from './src/navigation';
import './src/reminders';

const Tab = createBottomTabNavigator();
const More = createNativeStackNavigator<MoreStack>();

function MoreNavigator() {
  const p = usePalette();
  return (
    <More.Navigator
      screenOptions={{
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: p.accent,
        headerStyle: { backgroundColor: p.bg },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: p.bg },
      }}
    >
      <More.Screen name="MoreHome" component={MoreScreen} options={{ headerShown: false }} />
      <More.Screen name="Checkups" component={CheckupsScreen} />
      <More.Screen name="TakeCheckup" component={TakeCheckupScreen} options={{ presentation: 'modal', headerShown: false }} />
      <More.Screen name="Export" component={ExportScreen} />
      <More.Screen name="Settings" component={SettingsScreen} />
    </More.Navigator>
  );
}

const ICONS: Record<string, (c: string) => React.ReactNode> = {
  Today: c => (
    <>
      <Circle cx={12} cy={12} r={8} stroke={c} />
      <Path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke={c} />
    </>
  ),
  Log: c => <Path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" stroke={c} />,
  Conditions: c => <Path d="M4 19V9M10 19V5M16 19v-7M22 19H2" stroke={c} />,
  Evidence: c => <Path d="M4 7h6l2 2h8v10H4z" stroke={c} />,
  More: c => (
    <>
      <Circle cx={5} cy={12} r={1.5} stroke={c} />
      <Circle cx={12} cy={12} r={1.5} stroke={c} />
      <Circle cx={19} cy={12} r={1.5} stroke={c} />
    </>
  ),
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name](color)}
    </Svg>
  );
}

function Root() {
  const s = useStore();
  const p = usePalette();
  const dark = useIsDark();
  if (!s.onboarded) return <Welcome />;
  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: p.bg, card: p.surface, border: p.line, primary: p.accent, text: p.fg } }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: p.accent,
          tabBarInactiveTintColor: p.muted,
          tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
          tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line },
          tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        })}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="Conditions" component={ConditionsScreen} />
        <Tab.Screen name="Evidence" component={EvidenceScreen} />
        <Tab.Screen name="More" component={MoreNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const p = usePalette();
  const dark = useIsDark();
  const [loaded] = useFonts({
    SairaCondensed_600SemiBold,
    SairaCondensed_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    IBMPlexMono_400Regular,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: p.bg }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <LockGate>
            <Root />
          </LockGate>
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
