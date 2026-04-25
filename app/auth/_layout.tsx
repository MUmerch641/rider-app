import { Stack } from "expo-router";
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth_screen" />
      <Stack.Screen name="forgetPassword_screen" />
      <Stack.Screen name="otp_screen" />
      <Stack.Screen name="new_password_screen" />
    </Stack>
  );
}
