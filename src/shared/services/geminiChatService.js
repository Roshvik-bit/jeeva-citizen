/**
 * JEEVA Gemini AI Emergency Intake & Conversational Assistant Service
 * 
 * Empowers disaster-affected citizens and refugees who cannot or do not know how
 * to navigate complex multi-field emergency forms to submit their distress reports
 * naturally via conversational voice or text.
 */

const STORAGE_KEY_VITE = "VITE_GEMINI_API_KEY";
const STORAGE_KEY_GEN = "GEMINI_API_KEY";

// Recognized incident categories matching JEEVA system
export const EMERGENCY_CATEGORIES = [
  { id: "flood", label: "Flood / Waterlogging", icon: "Waves" },
  { id: "trapped", label: "People Trapped / Stranded", icon: "Users" },
  { id: "medical", label: "Medical Emergency / Casualty", icon: "HeartPulse" },
  { id: "blocked_road", label: "Blocked Road / Route Inaccessible", icon: "AlertTriangle" },
  { id: "bridge", label: "Damaged / Collapsed Bridge", icon: "Building2" },
  { id: "fire", label: "Fire Outbreak", icon: "Flame" },
  { id: "earthquake", label: "Earthquake / Building Collapse", icon: "Activity" },
  { id: "tsunami", label: "Tsunami / Tidal Surge", icon: "Waves" },
  { id: "other", label: "Other Crisis Hazard", icon: "AlertOctagon" }
];

/**
 * Retrieve Gemini API Key from localStorage or environment
 */
export const getGeminiApiKey = () => {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem(STORAGE_KEY_VITE) || window.localStorage.getItem(STORAGE_KEY_GEN);
    if (local && local.trim().length > 5) return local.trim();
  }
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (envKey && envKey.trim().length > 5) return envKey.trim();
  }
  if (typeof process !== "undefined" && process.env) {
    const procKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (procKey && procKey.trim().length > 5) return procKey.trim();
  }
  return "";
};

/**
 * Store Gemini API Key in browser localStorage
 */
export const saveGeminiApiKey = (key) => {
  if (typeof window === "undefined") return;
  const clean = (key || "").trim();
  if (clean) {
    window.localStorage.setItem(STORAGE_KEY_VITE, clean);
    window.localStorage.setItem(STORAGE_KEY_GEN, clean);
  } else {
    window.localStorage.removeItem(STORAGE_KEY_VITE);
    window.localStorage.removeItem(STORAGE_KEY_GEN);
  }
};

/**
 * Prompt instructions for Gemini Disaster Intake Assistant
 */
const SYSTEM_INSTRUCTION = `
You are JEEVA AI, an expert emergency disaster relief intake assistant.
Your mission is to help citizens in distress who don't know how to fill complex incident forms.
Your job is to talk to them conversationally, calm them down, extract essential crisis information, and build an official Emergency Distress Ticket.

CRITICAL MULTILINGUAL MANDATE (MUST FOLLOW):
- You MUST understand and process ANY language in the world:
  * Indian Languages: Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Bengali (বাংলা), Malayalam (മലയാളം), Marathi (मराठी), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), Urdu (اردو), etc.
  * Global Languages: English, Spanish, French, Arabic, German, Russian, Chinese, Portuguese, etc.
- ALWAYS respond to the citizen in the EXACT same language and script they spoke or wrote in, using a caring, reassuring, and supportive tone.
- HOWEVER, ensure that inside the JSON structure:
  * "category" is strictly one of the allowed English enum strings: ['flood', 'trapped', 'medical', 'blocked_road', 'bridge', 'fire', 'earthquake', 'tsunami', 'other']
  * "title", "description", and "medicalDetails" are translated and synthesized in clear, professional English for disaster dispatchers and field rescue teams (you may include the citizen's original statement in brackets).

ESSENTIAL INFORMATION TO GATHER:
1. Crisis Category: must be one of ['flood', 'trapped', 'medical', 'blocked_road', 'bridge', 'fire', 'earthquake', 'tsunami', 'other'].
2. Location or Landmark: where they are, street name, area, building, or notable landmark.
3. People Count: how many people need rescue or are affected (default to 1 if just themselves).
4. Medical Urgency: is anyone injured, unconscious, elderly, child, or requiring urgent medicine/oxygen.
5. Situation Summary: a clear, factual description for rescue dispatchers and field boats/teams.

GUIDELINES:
- Be compassionate, calm, reassuring, and concise. Do not write long paragraphs.
- Keep questions simple and ask only 1 or at most 2 brief questions at a time.
- If the user provides enough information (e.g. they mentioned what happened and a location or situation), mark "isReadyToSubmit": true so they can submit their ticket with 1 tap.
- Always output your response strictly as valid JSON matching the schema below:

{
  "message": "Empathetic reply in the citizen's exact language, acknowledging their situation and asking clarifying questions if anything is missing.",
  "extractedReport": {
    "title": "Concise headline in English e.g. 'Flood rescue needed at Anna Nagar 3rd St'",
    "category": "flood",
    "peopleCount": 3,
    "hasMedicalEmergency": false,
    "medicalDetails": "",
    "locationText": "Anna Nagar 3rd Street near bus stand",
    "description": "Ground floor flooded to chest level. 3 persons stranded.",
    "isReadyToSubmit": true
  },
  "suggestions": ["Share GPS Location", "2 people trapped", "No injuries", "Need boat"]
}
`;

/**
 * Intelligent Rule-Based Fallback Disaster Engine
 * Used when Gemini API key is missing or offline
 */
export const processWithLocalEmergencyEngine = (userMessage, existingReport = {}, currentCoords = null) => {
  const text = (userMessage || "").toLowerCase();
  
  // Category detection
  let category = existingReport.category || "flood";
  if (/fire|flame|smoke|burn|blaze/i.test(text)) category = "fire";
  else if (/trap|stuck|roof|maroon|cannot get out|surround/i.test(text)) category = "trapped";
  else if (/medical|blood|injur|heart|breath|unconscious|fever|wound|hospital|doctor|pill|insulin|oxygen|pregnant/i.test(text)) category = "medical";
  else if (/bridge|overpass|culvert/i.test(text)) category = "bridge";
  else if (/road|highway|street|path|tree fell|landslide|blocked|mud/i.test(text)) category = "blocked_road";
  else if (/earthquake|quake|tremor|wall collaps|building collaps|rubble/i.test(text)) category = "earthquake";
  else if (/tsunami|tidal wave|sea water/i.test(text)) category = "tsunami";
  else if (/water|flood|rain|submerg|drown|overflow|river/i.test(text)) category = "flood";

  // People count detection
  let peopleCount = existingReport.peopleCount || 1;
  const countMatch = text.match(/\b(\d+)\s*(people|persons|family|members|folks|adults|kids|children|us)\b/i) ||
                     text.match(/\b(we are|there are|trapped)\s*(\d+)\b/i) ||
                     text.match(/\b(\d+)\b/);
  if (countMatch) {
    const parsed = parseInt(countMatch[1] || countMatch[2], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 500) {
      peopleCount = parsed;
    }
  }

  // Medical emergency detection
  let hasMedicalEmergency = existingReport.hasMedicalEmergency || false;
  let medicalDetails = existingReport.medicalDetails || "";
  if (/medical|injur|wound|bleeding|pain|unconscious|oxygen|insulin|diabetes|pregnant|asthma|elderly|infant|baby|heart/i.test(text)) {
    hasMedicalEmergency = true;
    if (!medicalDetails) {
      const medMatch = text.match(/(injur\w*|wound\w*|bleed\w*|unconscious|asthma|insulin|pregnant|elderly|oxygen|heart[^\.\,\;]*)/i);
      medicalDetails = medMatch ? medMatch[0] : "Requires on-site medical evaluation";
    }
  }

  // Location detection
  let locationText = existingReport.locationText || "";
  if (!locationText) {
    const locMatch = text.match(/(?:at|in|near|around|on|ward|street|road|colony|nagar|sector)\s+([a-zA-Z0-9\s,\.-]{3,35})/i);
    if (locMatch && locMatch[1]) {
      locationText = locMatch[1].trim();
    } else if (currentCoords?.address) {
      locationText = currentCoords.address;
    }
  }

  const categoryItem = EMERGENCY_CATEGORIES.find(c => c.id === category) || EMERGENCY_CATEGORIES[0];
  const title = existingReport.title || `${categoryItem.label.split('/')[0].trim()} Distress Alert${locationText ? ` at ${locationText}` : ""}`;
  const description = existingReport.description 
    ? `${existingReport.description}. Additional note: ${userMessage}`
    : userMessage;

  // Check if we have enough to submit
  const hasBasicLocation = Boolean(locationText || currentCoords?.lat);
  const isReadyToSubmit = Boolean(userMessage.length >= 8);

  let reply = "";
  let suggestions = [];

  if (!hasBasicLocation && !currentCoords) {
    reply = `I have logged your ${categoryItem.label.split('/')[0].trim()} situation. Please share your current location or tap "Share GPS Location" below so rescue teams can reach you directly.`;
    suggestions = ["📍 Share my GPS location", "2 people needing help", "No injuries", "Water is rising fast"];
  } else if (!hasMedicalEmergency && !text.includes("injur") && !text.includes("safe")) {
    reply = `Understood. I have prepared your emergency ticket for ${peopleCount} person(s)${locationText ? ` at ${locationText}` : ""}. Does anyone with you need urgent medical care, or can you review and confirm below?`;
    suggestions = ["No medical injuries", "Yes, medical attention needed", "Water rising fast", "Please hurry"];
  } else {
    reply = `I have gathered your emergency details into the ticket below. Please review and tap "Confirm & Dispatch Emergency Report" to notify rescue command immediately!`;
    suggestions = ["🚨 Confirm Report", "Add more details", "Change location"];
  }

  return {
    message: reply,
    extractedReport: {
      title,
      category,
      peopleCount,
      hasMedicalEmergency,
      medicalDetails,
      locationText: locationText || (currentCoords?.address || "Current GPS Location"),
      description,
      isReadyToSubmit
    },
    suggestions,
    isLocalFallback: true
  };
};

/**
 * Send conversation to Gemini AI
 */
export const sendGeminiChatMessage = async ({
  messages,
  currentReport = null,
  currentCoords = null
}) => {
  const apiKey = getGeminiApiKey();
  const lastUserMessage = messages[messages.length - 1]?.content || "";

  // If no Gemini API key, use local emergency rule engine
  if (!apiKey) {
    return processWithLocalEmergencyEngine(lastUserMessage, currentReport || {}, currentCoords);
  }

  // Format context for Gemini
  const contextNotes = [];
  if (currentCoords) {
    contextNotes.push(`Citizen GPS: Lat ${currentCoords.lat}, Lng ${currentCoords.lng}, Address: "${currentCoords.address || 'Unknown'}"`);
  }
  if (currentReport) {
    contextNotes.push(`Current Draft State: ${JSON.stringify(currentReport)}`);
  }

  const promptWithContext = `
${contextNotes.length > 0 ? `[CURRENT SENSOR & FORM CONTEXT]\n${contextNotes.join("\n")}\n\n` : ""}
[CONVERSATION HISTORY]
${messages
  .map(m => `${m.sender === "user" ? "Citizen" : "JEEVA Assistant"}: ${m.content}`)
  .join("\n")}

Respond as JEEVA Assistant strictly in the specified JSON format.
`;

  // Active models available for this API key: gemini-3.6-flash, gemini-3.5-flash, gemini-3.1-flash-lite, gemini-flash-latest
  const modelsToTry = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${SYSTEM_INSTRUCTION}\n\n${promptWithContext}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.95,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini API error on model ${model}: ${response.status}`, errText);
        continue; // Try next model
      }

      const json = await response.json();
      const rawOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) continue;

      try {
        const parsed = JSON.parse(rawOutput);
        return {
          message: parsed.message || "I am recording your emergency details. Please verify the ticket below.",
          extractedReport: {
            title: parsed.extractedReport?.title || "Emergency Distress Report",
            category: parsed.extractedReport?.category || currentReport?.category || "flood",
            peopleCount: Number(parsed.extractedReport?.peopleCount) || currentReport?.peopleCount || 1,
            hasMedicalEmergency: Boolean(parsed.extractedReport?.hasMedicalEmergency),
            medicalDetails: parsed.extractedReport?.medicalDetails || "",
            locationText: parsed.extractedReport?.locationText || currentReport?.locationText || currentCoords?.address || "Disaster Zone",
            description: parsed.extractedReport?.description || lastUserMessage,
            isReadyToSubmit: parsed.extractedReport?.isReadyToSubmit !== false
          },
          suggestions: parsed.suggestions || ["Share GPS Location", "2 people trapped", "Confirm and Submit"],
          isLocalFallback: false,
          modelUsed: model
        };
      } catch (parseErr) {
        console.warn("JSON parse error on Gemini response, fallback to text regex:", parseErr);
        // Attempt clean substring extraction if wrapped in code fence
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            message: parsed.message || rawOutput,
            extractedReport: parsed.extractedReport || currentReport,
            suggestions: parsed.suggestions || [],
            isLocalFallback: false,
            modelUsed: model
          };
        }
      }
    } catch (netErr) {
      console.warn(`Network/fetch exception for model ${model}:`, netErr);
    }
  }

  // If Gemini calls failed or timed out, gracefully fallback to local emergency rule engine
  return processWithLocalEmergencyEngine(lastUserMessage, currentReport || {}, currentCoords);
};

export const geminiChatService = {
  getGeminiApiKey,
  saveGeminiApiKey,
  sendGeminiChatMessage,
  processWithLocalEmergencyEngine,
  EMERGENCY_CATEGORIES
};
