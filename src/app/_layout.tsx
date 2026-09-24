import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider } from '@/providers/session-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          {/* main app (guest can browse) */}
          <Stack.Screen name="(app)" />
          {/* auth opens as a modal on top of the app */}
          <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
          {/* create-list opens as a modal too */}
          <Stack.Screen name="create-list" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SessionProvider>
  );
}
