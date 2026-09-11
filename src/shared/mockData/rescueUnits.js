export const RESCUE_UNITS = [
  {
    id: "UNIT-NDRF-01",
    name: "NDRF 4th Battalion - Water Rescue Boat A",
    type: "Rescue Boat",
    baseLocation: "North Waterfront Hub",
    status: "Available", // "Available" | "Dispatched" | "On Scene"
    assignedIncidentId: null,
    capabilities: ["Inflatable Motor Boats", "Lifejackets (50)", "High-Power Sonar", "Divers"],
    personnelCount: 8,
    contact: "+91 94320 11001",
    lat: 13.0827,
    lng: 80.2707
  },
  {
    id: "UNIT-NDRF-02",
    name: "NDRF Deep Water Rescue Squad B",
    type: "Rescue Boat",
    baseLocation: "Central Barrage Depot",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["Rigid Inflatable Hull", "Flood Evacuation", "Rope Rescue"],
    personnelCount: 6,
    contact: "+91 94320 11002",
    lat: 13.0780,
    lng: 80.2520
  },
  {
    id: "UNIT-MED-108",
    name: "108 Advanced Life Support (ALS) Ambulance #12",
    type: "Medical Team",
    baseLocation: "Govt General Hospital Base",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["Ventilators", "Defibrillators", "Trauma Care", "Oxygen Supply", "Emergency Doctors"],
    personnelCount: 4,
    contact: "+91 108 000 1212",
    lat: 13.0805,
    lng: 80.2810
  },
  {
    id: "UNIT-MED-109",
    name: "Mobile Trauma & Triage Field Unit #03",
    type: "Medical Team",
    baseLocation: "South Relief Camp",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["Portable Stretchers", "Emergency Blood Packs", "IV Fluids", "Burns Kit"],
    personnelCount: 5,
    contact: "+91 108 000 1213",
    lat: 13.0450,
    lng: 80.2450
  },
  {
    id: "UNIT-SDRF-ENG",
    name: "SDRF Heavy Earthmover & Debris Clearance #05",
    type: "Road Clearance Unit",
    baseLocation: "West Ring Road Depot",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["JCB Excavator", "Hydraulic Cutters", "Concrete Breakers", "Search Dog Unit"],
    personnelCount: 6,
    contact: "+91 94440 22005",
    lat: 13.0650,
    lng: 80.2200
  },
  {
    id: "UNIT-FIRE-HAZ",
    name: "Fire & Disaster HAZMAT Tender #09",
    type: "Fire Tender",
    baseLocation: "Central Fire Station",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["High-Pressure Water Cannon", "Chemical Foam", "Thermal Imaging Cameras"],
    personnelCount: 6,
    contact: "+91 101 000 0009",
    lat: 13.0720,
    lng: 80.2600
  },
  {
    id: "UNIT-DRONE-01",
    name: "Airborne Thermal Drone Recon Squad #01",
    type: "Recon Drone",
    baseLocation: "Command HQ Rooftop",
    status: "Available",
    assignedIncidentId: null,
    capabilities: ["Infrared Night Vision", "Megaphone Audio Broadcast", "Lifebuoy Drop"],
    personnelCount: 2,
    contact: "+91 94111 88001",
    lat: 13.0878,
    lng: 80.2785
  }
];
