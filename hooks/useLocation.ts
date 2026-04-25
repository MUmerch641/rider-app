import * as Location from "expo-location";
import { LocationObjectCoords } from "expo-location";
import { useEffect, useState } from "react";

export const useLocation = () => {
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      // Watch driver movement in real time
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000 },
        (newLoc) => setLocation(newLoc.coords),
      );
    })();
  }, []);

  return location;
};
