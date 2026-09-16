/**
 * Geolocation and Mapping Utilities for JEEVA
 */

export const LANDMARK_PRESETS = [
  { name: "Ward 8 Riverbed Old Age Home", lat: 13.0845, lng: 80.2740 },
  { name: "Canal Arterial Overpass & Metro Pillar", lat: 13.0690, lng: 80.2510 },
  { name: "Kamaraj Colony Flood Zone", lat: 13.0760, lng: 80.2645 },
  { name: "Dockside Substation & Market Road", lat: 13.0910, lng: 80.2830 },
  { name: "Hill Link Road KM 14", lat: 13.0580, lng: 80.2380 },
  { name: "Central Relief Camp & Community Hall", lat: 13.0420, lng: 80.2590 }
];

export const geoService = {
  /**
   * Calculates Haversine distance in meters between two lat/lng coordinates
   */
  getDistanceMeters: (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  },

  /**
   * Obtains current GPS coordinates or returns simulated field coordinates
   */
  getCurrentCoordinates: async () => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5)),
              accuracy: Math.round(pos.coords.accuracy || 10),
              isSimulated: false,
              isBlocked: false
            });
          },
          (err) => {
            console.warn("Geolocation denied or unavailable, using disaster grid simulation:", err.message);
            // Default to disaster grid center with slight random offset (~100m)
            const jitterLat = (Math.random() - 0.5) * 0.008;
            const jitterLng = (Math.random() - 0.5) * 0.008;
            resolve({
              lat: Number((13.0827 + jitterLat).toFixed(5)),
              lng: Number((80.2707 + jitterLng).toFixed(5)),
              accuracy: 12,
              isSimulated: true,
              isBlocked: err.code === 1,
              errorCode: err.code,
              errorMessage: err.message
            });
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        resolve({
          lat: 13.0827,
          lng: 80.2707,
          accuracy: 50,
          isSimulated: true,
          isBlocked: true,
          errorMessage: "Geolocation not supported in browser"
        });
      }
    });
  },

  /**
   * Checks current geolocation permission status
   */
  checkPermissionState: async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: "geolocation" });
        return status.state; // 'granted' | 'prompt' | 'denied'
      }
    } catch (_) {}
    return "unknown";
  },

  /**
   * Reverse geocodes coordinates to a readable human location
   */
  getReadableAddress: (lat, lng) => {
    // Find closest known landmark
    let closest = LANDMARK_PRESETS[0];
    let minDistance = Infinity;

    for (const p of LANDMARK_PRESETS) {
      const d = geoService.getDistanceMeters(lat, lng, p.lat, p.lng);
      if (d < minDistance) {
        minDistance = d;
        closest = p;
      }
    }

    if (minDistance < 600) {
      return `${closest.name} (~${minDistance}m away, Sector ${Math.floor(minDistance / 100) + 1})`;
    }

    return `Coordinates: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (Disaster Grid Zone Alpha)`;
  },

  /**
   * Reverse geocodes coordinates to a human-readable address using OpenStreetMap Nominatim
   * Falls back smoothly to local landmark presets if offline or network drops
   */
  reverseGeocodeOSM: async (lat, lng) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: { "Accept-Language": "en" },
          signal: controller.signal
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Truncate overly long address string for cleaner mobile display
          const parts = data.display_name.split(",");
          return parts.slice(0, 3).join(",").trim();
        }
      }
    } catch (err) {
      // Offline fallback
    }
    return geoService.getReadableAddress(lat, lng);
  }
};
