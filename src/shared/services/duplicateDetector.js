import { geoService } from "./geoService";
import { calculatePriorityScore } from "./priorityScoring";

/**
 * Spatial-Temporal Duplicate Detection & Report Consolidation Engine
 * Merges proximate incident reports within 500m of identical disaster category.
 */
export const duplicateDetector = {
  /**
   * Evaluates if an incoming report duplicates or corroborates an existing incident
   * @param {Object} incomingReport - Raw citizen report
   * @param {Array} currentIncidents - Existing active incidents
   * @param {number} radiusMeters - Proximity threshold (default: 500m)
   * @returns {Object} result containing duplicate status and merged incident
   */
  processIncomingReport: (incomingReport, currentIncidents, radiusMeters = 500) => {
    const reportLat = incomingReport.location?.lat;
    const reportLng = incomingReport.location?.lng;

    if (!reportLat || !reportLng) {
      return { isDuplicate: false };
    }

    // Do not cluster false alarms with genuine disaster incidents
    const incomingIsFalse = Boolean(
      incomingReport.isFalseAlarm ||
      incomingReport.aiClassification?.isFalseAlarm ||
      incomingReport.aiClassification?.isValidDisaster === false
    );
    if (incomingIsFalse) {
      return { isDuplicate: false };
    }

    // Find closest open incident of the same category or extreme proximity
    for (const incident of currentIncidents) {
      if (incident.status === "Resolved") continue;
      if (incident.isFalseAlarm || incident.aiClassification?.isFalseAlarm || incident.severity === "False Alarm") continue;

      const incLat = incident.location?.lat;
      const incLng = incident.location?.lng;
      if (!incLat || !incLng) continue;

      const distance = geoService.getDistanceMeters(reportLat, reportLng, incLat, incLng);

      const isSameCategory = incident.category === incomingReport.category;
      const isUltraClose = distance <= 200; // Even across categories, within 200m is the exact same disaster epicenter

      if (distance <= radiusMeters && (isSameCategory || isUltraClose)) {
        // MATCH FOUND: Consolidate!
        const isIncomingSos = Boolean(incomingReport.isQuickSOS || incomingReport.isSOS || incomingReport.title?.includes("SOS"));
        const existingSubReports = incident.subReports || [];
        const newSubReport = {
          id: "SUB-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          reportedAt: incomingReport.timestamp || new Date().toISOString(),
          reporter: incomingReport.reporterName || (isIncomingSos ? "Refugee/Citizen SOS Beacon" : "Citizen Report"),
          contact: incomingReport.reporterContact || "Anonymous/Field SOS",
          peopleCount: isIncomingSos || incomingReport.peopleCount == null ? null : (incomingReport.peopleCount || 1),
          note: incomingReport.description || (isIncomingSos ? "1-Tap emergency distress beacon activated" : "Corroborating distress call received via JEEVA portal"),
          photoUrl: isIncomingSos ? null : (incomingReport.photoUrl || null)
        };

        const updatedSubReports = [newSubReport, ...existingSubReports];
        const newCorroborationCount = (incident.corroboratingReportsCount || 1) + 1;
        let updatedPeopleCount = incident.peopleCount;
        if (!isIncomingSos && incomingReport.peopleCount != null) {
          const incCount = incident.peopleCount || 0;
          updatedPeopleCount = Math.max(incCount, incCount + Math.floor((incomingReport.peopleCount || 1) * 0.7));
        }

        // Recalculate enhanced priority score with new corroboration count & victims
        const candidateForScoring = {
          ...incident,
          peopleCount: updatedPeopleCount,
          hasMedicalEmergency: incident.hasMedicalEmergency || incomingReport.hasMedicalEmergency,
          corroboratingReportsCount: newCorroborationCount,
          timestamp: new Date().toISOString() // refresh recency
        };

        const { priorityScore, severity, scoreBreakdown } = calculatePriorityScore(candidateForScoring);

        const updatedIncident = {
          ...candidateForScoring,
          priorityScore,
          severity,
          scoreBreakdown,
          subReports: updatedSubReports,
          corroboratingReportsCount: newCorroborationCount
        };

        return {
          isDuplicate: true,
          distanceMeters: distance,
          matchedIncidentId: incident.id,
          updatedIncident
        };
      }
    }

    return { isDuplicate: false };
  }
};
