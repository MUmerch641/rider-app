import { Redirect } from "expo-router";

// Root route. Without this, opening the app at the bare scheme (driverapp:///,
// e.g. a notification response that carries no in-app URL) had no route to
// match and showed expo-router's "Unmatched Route" screen. Redirect to the map;
// the global RouteGuard (app/_layout.tsx) bounces to /auth when signed out.
export default function RootIndex() {
  return <Redirect href="/(tabs)/onmap" />;
}
