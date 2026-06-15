import { Redirect } from "expo-router";

// The old "Today's Summary / Active Orders / New Orders Nearby" page is RETIRED.
// Its content now lives in the map screen's bottom sheet. expo-router resolves
// `/(tabs)` to this index route, so instead of rendering the dead summary page
// we bounce straight to the map — the rider ALWAYS lands on the map, whether
// from cold start, post-login, or a notification tap.
export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/onmap" />;
}
