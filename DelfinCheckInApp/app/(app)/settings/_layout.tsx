import { Stack } from 'expo-router';

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="general" />
      <Stack.Screen name="checkin-instructions" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="cleaning-calendar" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="banking" />
      <Stack.Screen name="reputation" />
      <Stack.Screen name="support" />
      <Stack.Screen name="company" />
      <Stack.Screen name="mir" />
      <Stack.Screen name="properties" />
      <Stack.Screen name="country" />
      <Stack.Screen name="language" />
    </Stack>
  );
}
