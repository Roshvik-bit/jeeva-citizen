import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { geoService, LANDMARK_PRESETS } from "@jeeva/shared";
import { MapPin, MapPinOff, Navigation, Compass, CheckCircle2, Map as MapIcon, ChevronDown, ChevronUp } from "lucide-react";

export const LocationPicker = ({
  location,
  setLocation,
  isLocationPermitted = true,
  setIsLocationPermitted,
  onOpenPermissionModal
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const handleAutoDetect = async () => {
    setIsLocating(true);
    try {
      const permState = await geoService.checkPermissionState();
      if (permState === "denied") {
        if (setIsLocationPermitted) setIsLocationPermitted(false);
        if (onOpenPermissionModal) onOpenPermissionModal();
        return;
      }

      const coords = await geoService.getCurrentCoordinates();
      if (coords.isBlocked) {
        if (setIsLocationPermitted) setIsLocationPermitted(false);
        if (onOpenPermissionModal) onOpenPermissionModal();
        return;
      }

      let address = "";
      try {
        address = await geoService.reverseGeocodeOSM(coords.lat, coords.lng);
      } catch (_) {
        address = geoService.getReadableAddress(coords.lat, coords.lng);
      }

      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        address: address || geoService.getReadableAddress(coords.lat, coords.lng),
        landmark: coords.isSimulated ? "Simulated Grid Pin" : "GPS Triangulated",
        accuracy: coords.accuracy || 10
      });

      if (setIsLocationPermitted) setIsLocationPermitted(true);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
      }
    } catch (err) {
      console.error("GPS detection error:", err);
      if (setIsLocationPermitted) setIsLocationPermitted(false);
      if (onOpenPermissionModal) onOpenPermissionModal();
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setLocation({
      lat: preset.lat,
      lng: preset.lng,
      address: preset.name,
      landmark: "Disaster Sector Checkpoint",
      accuracy: 8
    });
    setShowPresets(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 15, { duration: 0.8 });
    }
  };

  // Initialize interactive OpenStreetMap
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const currentLat = location?.lat || 13.0827;
    const currentLng = location?.lng || 80.2707;

    const map = L.map(container, {
      center: [currentLat, currentLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Standard OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc"
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Draggable OpenStreetMap Emergency Pin
    const pinIcon = L.divIcon({
      className: "custom-osm-picker-pin",
      html: `
        <div style="position: relative; width: 32px; height: 32px; cursor: grab;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #ef4444; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 14px;">
            📍
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([currentLat, currentLng], {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Click map to reposition pin & reverse-geocode with OpenStreetMap
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      const newLat = Number(lat.toFixed(5));
      const newLng = Number(lng.toFixed(5));
      marker.setLatLng([newLat, newLng]);
      const address = await geoService.reverseGeocodeOSM(newLat, newLng);
      setLocation((prev) => ({
        ...prev,
        lat: newLat,
        lng: newLng,
        address: address,
        landmark: "OpenStreetMap Pin Drop"
      }));
    });

    // Drag pin to reposition
    marker.on("dragend", async (e) => {
      const { lat, lng } = e.target.getLatLng();
      const newLat = Number(lat.toFixed(5));
      const newLng = Number(lng.toFixed(5));
      const address = await geoService.reverseGeocodeOSM(newLat, newLng);
      setLocation((prev) => ({
        ...prev,
        lat: newLat,
        lng: newLng,
        address: address,
        landmark: "OpenStreetMap Pin Drop"
      }));
    });

    // Layout adjustment
    const timer = setTimeout(() => map.invalidateSize(), 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      if (container) {
        container._leaflet_id = null;
      }
    };
  }, [showMap]);

  // Sync marker position when external coords update
  useEffect(() => {
    if (markerRef.current && location?.lat && location?.lng) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    }
  }, [location?.lat, location?.lng]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-red-600" />
          <span>GPS Coordinates &amp; Location</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md bg-white border border-slate-300 shadow-xs cursor-pointer"
            title="Toggle Map"
          >
            <MapIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>{showMap ? "Hide Map" : "Show Map"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isLocationPermitted && onOpenPermissionModal) {
                onOpenPermissionModal();
              } else {
                handleAutoDetect();
              }
            }}
            disabled={isLocating}
            className={`text-xs font-semibold flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md cursor-pointer shadow-xs border ${
              !isLocationPermitted
                ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                : "bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-200"
            }`}
          >
            {isLocating ? (
              <>
                <Navigation className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : !isLocationPermitted ? (
              <>
                <MapPinOff className="w-3.5 h-3.5 text-red-600" />
                <span>Couldn't Detect GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Auto-Detect GPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Blocked GPS Warning Card */}
      {!isLocationPermitted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-900 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <MapPinOff className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-red-950 block truncate">
                Couldn't detect GPS
              </span>
              <span className="text-[11px] text-red-700 block truncate">
                Location access is blocked. Emergency reports require location.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPermissionModal}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            Turn On
          </button>
        </div>
      )}

      {/* Embedded OpenStreetMap Pin-Drop View */}
      {showMap && (
        <div className="relative z-0 isolate w-full h-[180px] rounded-lg overflow-hidden border border-slate-300 shadow-xs">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-2 left-2 z-[20] bg-white/95 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-700 flex items-center gap-1 shadow-xs">
            <span>Tap or drag pin to adjust location</span>
          </div>
          <div className="absolute bottom-1 left-2 z-[20] text-[9px] text-slate-500 bg-white/80 px-1 rounded">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>
          </div>
        </div>
      )}

      {/* Coordinate & Address Preview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="truncate">{location.address || "Fetching address..."}</span>
            </p>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              <span>LAT: {location.lat?.toFixed(4) || "13.0827"}</span>
              <span>LNG: {location.lng?.toFixed(4) || "80.2707"}</span>
              {location.accuracy && (
                <span className="text-[10px] text-slate-400">±{location.accuracy}m accuracy</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-[11px] font-medium text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
          >
            {showPresets ? "Close" : "Landmarks"}
          </button>
        </div>

        {/* Quick Disaster Zone Landmark Selector */}
        {showPresets && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1.5 animate-fadeIn">
            <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wide">
              Quick Pick Known Disaster Hotspots:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {LANDMARK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 truncate transition-colors cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
