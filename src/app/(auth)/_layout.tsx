import { Stack } from 'expo-router';

// Auth screens live in a modal stack (opened from the (app) tabs).
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
