/**
 * Smart Priority Scoring Engine for JEEVA (SIH26013)
 * Multi-factor algorithmic ranking for disaster incidents
 * Normalized strictly to a 0.0 - 10.0 scale
 * 
 * Rules:
 * 1. False Alarms / Fake Reports are STRICTLY assigned Priority Score: 0.0
 * 2. Natural Disasters (Flood, Landslide, Cyclone, Earthquake, Collapse) receive elevated base priority
 * 3. Health Issues & Acute Medical Emergencies receive prioritized triage weights (+2.5 - 3.5)
 * 4. Fire Emergencies receive rapid escalation hazard weights (3.2)
 * 5. Absolute Emergencies (Trapped victims >= 5, Combined Disaster + Medical, High Urgency) receive absolute priority boost (up to 10.0)
 */

export const calculatePriorityScore = (incident) => {
  const {
    peopleCount = 1,
    hasMedicalEmergency = false,
    category = "flood",
    aiClassification = {},
    timestamp = new Date().toISOString(),
    corroboratingReportsCount = 1,
    isAbsoluteEmergency = false
  } = incident;

  // 0. Image / Statement Disaster Verification Check
  const isInvalidOrFalse = Boolean(
    aiClassification?.isFalseAlarm ||
    aiClassification?.isValidDisaster === false ||
    aiClassification?.isFakeReport ||
    aiClassification?.isInvalidImage ||
    aiClassification?.urgencyAssessment === "FALSE_ALARM_DISMISSED"
  );

  if (isInvalidOrFalse) {
    const isRequiresReview = Boolean(
      aiClassification?.status === "REQUIRES_REVIEW" ||
      (aiClassification?.isInvalidImage && aiClassification?.hasGenuineText)
    );
    const assignedScore = isRequiresReview ? 1.0 : 0.0;
    const assignedStatus = isRequiresReview ? "REQUIRES_REVIEW" : "REJECTED";
    const assignedSeverity = isRequiresReview ? "Requires Review" : "False Alarm";
    const reason = aiClassification?.verificationReason ||
      "Image does not appear to match a disaster emergency. Please upload a valid incident photo or provide a detailed text description.";

    return {
      priorityScore: assignedScore,
      severity: assignedSeverity,
      status: assignedStatus,
      isFalseAlarm: !isRequiresReview,
      isRequiresReview,
      isInvalidImage: Boolean(aiClassification?.isInvalidImage),
      isRealReport: false,
      scoreBreakdown: {
        peopleScore: 0,
        medicalScore: 0,
        categoryScore: isRequiresReview ? 1.0 : 0,
        aiHazardScore: 0,
        absoluteEmergencyBonus: 0,
        recencyScore: 0,
        corroborationScore: 0,
        explanation: `⚠️ Image Verification Notice (Score: ${assignedScore}/10, Status: ${assignedStatus}). Reason: ${reason}`
      }
    };
  }

  const catLower = (category || "").toLowerCase();

  // Category classification helpers
  const isNaturalDisaster = [
    "flood",
    "landslide",
    "cyclone",
    "earthquake",
    "tsunami",
    "collapse"
  ].includes(catLower);
  const isHealthEmergency = catLower === "medical";
  const isFireEmergency = catLower === "fire";
  const isTrappedEmergency = catLower === "trapped";

  // 1. Category Hazard Base Weight (Max: 3.5 pts)
  // Higher priority for Natural Disasters, Health Issues, Fire Emergencies, and Trapped Civilians
  let categoryScore = 1.5;
  if (isHealthEmergency) {
    categoryScore = 3.5; // Direct acute medical hazard / life preservation
  } else if (isFireEmergency) {
    categoryScore = 3.2; // Rapidly advancing fire / combustion / smoke inhalation
  } else if (isTrappedEmergency) {
    categoryScore = 3.4; // Entombed or stranded civilians needing extraction
  } else if (isNaturalDisaster) {
    categoryScore = 3.0; // Flood, landslide, cyclone, earthquake, collapse
  } else if (catLower === "bridge") {
    categoryScore = 2.2; // Structural bridge collapse
  } else if (catLower === "blocked_road") {
    categoryScore = 1.4; // Transit obstruction
  }

  // 2. Health & Medical Urgency Weight (Max: 2.5 pts)
  const medicalScore = (hasMedicalEmergency || isHealthEmergency) ? 2.5 : 0.0;

  // 3. People / Victims Danger Weight (Max: 2.5 pts)
  let peopleScore = 0.8;
  const count = peopleCount != null ? Math.max(1, Number(peopleCount) || 1) : null;
  if (count == null && (incident.isQuickSOS || incident.isSOS || incident.title?.includes("SOS"))) {
    // 1-Tap SOS beacon: refugee/citizen panic alert carries immediate high distress baseline
    peopleScore = 1.6;
  } else if (count != null) {
    if (count >= 20) peopleScore = 2.5;
    else if (count >= 10) peopleScore = 2.0;
    else if (count >= 5) peopleScore = 1.6;
    else if (count >= 2) peopleScore = 1.2;
  }

  // 4. AI Hazard Severity Weight (Max: 1.5 pts)
  const rawAiSeverity = aiClassification?.hazardSeverity != null
    ? Number(aiClassification.hazardSeverity)
    : (isNaturalDisaster || isFireEmergency || isHealthEmergency ? 8.0 : 5.5);
  const aiHazardScore = Number(((Math.min(10, Math.max(0, rawAiSeverity)) / 10) * 1.5).toFixed(1));

  // 5. Absolute Emergency Multiplier / Bonus (Max: 1.5 pts)
  // Triggered when multiple life-critical conditions coincide:
  // - 1-Tap SOS Beacon Broadcast
  // - Trapped victims >= 5
  // - Natural disaster or Fire combined with active Medical Emergency
  // - Massive casualty footprint (count >= 15)
  // - Explicit absolute emergency flag from triage AI
  const isAbsolute = Boolean(
    isAbsoluteEmergency ||
    incident.isQuickSOS ||
    incident.isSOS ||
    incident.title?.includes("SOS") ||
    (hasMedicalEmergency && (isNaturalDisaster || isFireEmergency || isTrappedEmergency)) ||
    (peopleCount != null && isTrappedEmergency && Number(peopleCount) >= 5) ||
    (peopleCount != null && Number(peopleCount) >= 15 && isNaturalDisaster) ||
    aiClassification?.urgencyAssessment === "CRITICAL_IMMEDIATE_ACTION" ||
    aiClassification?.urgencyAssessment === "LIFE_THREATENING_MEDICAL"
  );

  const absoluteEmergencyBonus = isAbsolute ? 1.5 : 0.0;

  // 6. Recency Factor (Max: 0.5 pt)
  const elapsedMinutes = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60));
  let recencyScore = 0.5;
  if (elapsedMinutes > 180) recencyScore = 0.1;
  else if (elapsedMinutes > 60) recencyScore = 0.25;
  else if (elapsedMinutes > 30) recencyScore = 0.4;

  // 7. Corroborating Duplicate Reports Factor (Max: 0.5 pt)
  let corroborationScore = 0.0;
  if (corroboratingReportsCount >= 4) corroborationScore = 0.5;
  else if (corroboratingReportsCount >= 2) corroborationScore = 0.25;

  // Total Score strictly normalized between 1.0 and 10.0 for genuine emergencies
  const rawTotal = categoryScore + medicalScore + peopleScore + aiHazardScore + absoluteEmergencyBonus + recencyScore + corroborationScore;
  const priorityScore = Number(Math.min(10.0, Math.max(1.0, rawTotal)).toFixed(1));

  // Determine qualitative severity label based on standard emergency response tiers
  let severity = "Low";
  if (priorityScore >= 8.5) severity = "Critical";
  else if (priorityScore >= 6.5) severity = "High";
  else if (priorityScore >= 4.0) severity = "Medium";

  const disasterTypeTags = [];
  if (isNaturalDisaster) disasterTypeTags.push("Natural Disaster");
  if (isHealthEmergency || hasMedicalEmergency) disasterTypeTags.push("Health Emergency");
  if (isFireEmergency) disasterTypeTags.push("Fire Emergency");
  if (isAbsolute) disasterTypeTags.push("Absolute Emergency");

  const explanation = `Score ${priorityScore}/10 [${severity}]: Category ${category} (${categoryScore} pts) + ${
    hasMedicalEmergency ? "Medical Distress (2.5 pts)" : "No Medical (0 pts)"
  } + ${count != null ? `Victims ${count} (${peopleScore} pts)` : `1-Tap SOS Beacon (${peopleScore} pts)`} + AI Hazard (${aiHazardScore} pts)${
    absoluteEmergencyBonus > 0 ? ` + Absolute Emergency (+${absoluteEmergencyBonus} pts)` : ""
  } + Recency/Cluster (${(recencyScore + corroborationScore).toFixed(1)} pts)`;

  return {
    priorityScore,
    severity,
    status: "Pending",
    isFalseAlarm: false,
    isRealReport: true,
    isNaturalDisaster,
    isHealthEmergency: Boolean(hasMedicalEmergency || isHealthEmergency),
    isFireEmergency,
    isAbsoluteEmergency: isAbsolute,
    disasterTypeTags,
    scoreBreakdown: {
      categoryScore,
      medicalScore,
      peopleScore,
      aiHazardScore,
      absoluteEmergencyBonus,
      recencyScore,
      corroborationScore,
      explanation
    }
  };
};
