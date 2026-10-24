import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme as NavTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient } from '@/lib/query';
import { ScanSessionProvider } from '@/state/scan-session';
import { SettingsProvider } from '@/state/settings';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <ScanSessionProvider>
            <RootNavigator />
          </ScanSessionProvider>
        </QueryClientProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const { colors } = theme;

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  const base = theme.dark ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
      notification: colors.error,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 20, fontWeight: '500', color: colors.onSurface },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="analyze" options={{ animation: 'fade' }} dangerouslySingular />
        <Stack.Screen name="result/[id]" options={{ headerShown: true, title: '', animation: 'slide_from_right' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
