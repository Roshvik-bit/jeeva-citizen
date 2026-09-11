import { supabase, isSupabaseConfigured } from "./supabaseClient";

/**
 * Convert a Data URL or raw Base64 string to a standard Blob
 */
export const dataUrlToBlob = (dataUrl, fallbackMime = "application/octet-stream") => {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  try {
    let mime = fallbackMime;
    let base64Data = dataUrl;

    if (dataUrl.includes(";base64,")) {
      const parts = dataUrl.split(";base64,");
      mime = parts[0].replace("data:", "") || fallbackMime;
      base64Data = parts[1];
    } else if (dataUrl.startsWith("data:")) {
      const parts = dataUrl.split(",");
      base64Data = parts[1] || "";
    }

    const binary = atob(base64Data.trim());
    const len = binary.length;
    const array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch (err) {
    console.warn("dataUrlToBlob parsing error:", err);
    return null;
  }
};

/**
 * Maps Supabase PostgreSQL snake_case row to JEEVA camelCase incident object
 */
export const mapRowToIncident = (row) => {
  if (!row) return null;
  const audioData = row.audio_url || null;
  const isSos = Boolean(
    row.title?.includes("SOS") ||
    row.voice_transcript?.includes("SOS") ||
    row.description?.includes("SOS") ||
    row.is_sos
  );

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    severity: row.severity,
    status: row.status || "Pending",
    priorityScore: row.priority_score != null ? Number(row.priority_score) : 5.0,
    peopleCount: isSos || row.people_count == null ? null : (row.people_count || 1),
    isQuickSOS: isSos,
    isSOS: isSos,
    hasMedicalEmergency: Boolean(row.has_medical),
    medicalDetails: row.medical_details || "",
    description: row.description || "",
    location: row.location || { address: "Unknown Location", lat: 13.0827, lng: 80.2707 },
    photoUrl: isSos ? null : (row.photo_url || null),
    audioUrl: audioData,
    audioBase64: audioData && audioData.startsWith("data:audio") ? audioData : null,
    voiceTranscript: row.voice_transcript || "",
    aiClassification: row.ai_classification || null,
    timestamp: row.created_at || new Date().toISOString(),
    citizenId: row.citizen_id || row.location?.citizen_id || row.location?.citizenId || row.ai_classification?.citizen_id || null,
    recommendedResource: row.recommended_resource || "Rescue Boat",
    assignedUnit: row.assigned_unit || null,
    corroboratingReportsCount: row.corroborating_reports_count || 1,
    subReports: row.sub_reports || []
  };
};

/**
 * Maps JEEVA camelCase incident object to Supabase PostgreSQL snake_case payload
 * Ensures audio_url and photo_url are always clean URLs under 1024 characters
 */
export const mapIncidentToRow = (incident) => {
  const isSos = Boolean(
    incident.isQuickSOS ||
    incident.isSOS ||
    incident.title?.includes("SOS") ||
    incident.voiceTranscript?.includes("SOS")
  );

  // Only accept clean HTTP/HTTPS URLs under 1024 characters for database columns
  let cleanPhotoUrl = null;
  if (
    !isSos &&
    incident.photoUrl &&
    typeof incident.photoUrl === "string" &&
    (incident.photoUrl.startsWith("http://") || incident.photoUrl.startsWith("https://")) &&
    incident.photoUrl.length <= 1024
  ) {
    cleanPhotoUrl = incident.photoUrl;
  }

  let cleanAudioUrl = null;
  if (
    incident.audioUrl &&
    typeof incident.audioUrl === "string" &&
    (incident.audioUrl.startsWith("http://") || incident.audioUrl.startsWith("https://")) &&
    incident.audioUrl.length <= 1024
  ) {
    cleanAudioUrl = incident.audioUrl;
  }

  const citizenId = incident.citizenId || (incident.location && incident.location.citizen_id) || null;
  const locationPayload = {
    ...(incident.location || { address: "Unknown Location", lat: 13.0827, lng: 80.2707 }),
    citizen_id: citizenId
  };

  return {
    id: incident.id,
    title: incident.title,
    category: incident.category,
    severity: incident.severity,
    status: incident.status || "Pending",
    priority_score: incident.priorityScore,
    people_count: isSos || incident.peopleCount == null ? null : (incident.peopleCount || 1),
    has_medical: Boolean(incident.hasMedicalEmergency),
    medical_details: incident.medicalDetails || "",
    description: incident.description || "",
    location: locationPayload,
    photo_url: cleanPhotoUrl,
    audio_url: cleanAudioUrl,
    voice_transcript: incident.voiceTranscript || "",
    ai_classification: incident.aiClassification || null,
    citizen_id: citizenId,
    recommended_resource: incident.recommendedResource || "Rescue Boat",
    assigned_unit: incident.assignedUnit || null,
    corroborating_reports_count: incident.corroboratingReportsCount || 1,
    created_at: incident.timestamp || new Date().toISOString()
  };
};

/**
 * Upload an audio recording to Supabase Storage bucket ('incident-media' or 'audio-reports')
 * Appends Date.now() to ensure a unique filename and returns ONLY the lightweight public URL string.
 * This guarantees no raw base64 or heavy binary is ever sent in database insert payloads, preventing 413 errors.
 */
export const uploadAudioFile = async (audioSource, incidentId = "incident") => {
  if (!isSupabaseConfigured || !supabase || !audioSource) return null;

  // If already a public https URL, return as-is
  if (
    typeof audioSource === "string" &&
    (audioSource.startsWith("http://") || audioSource.startsWith("https://")) &&
    audioSource.length <= 1024
  ) {
    return audioSource;
  }

  try {
    const cleanId = String(incidentId).replace(/[^a-zA-Z0-9_-]/g, "") || "voice";
    // Append timestamp (Date.now()) to guarantee unique filename and prevent upload conflicts
    const fileName = `audios/audio_${cleanId}_${Date.now()}.webm`;
    const mimeType = "audio/webm";

    let blobToUpload = null;
    if (typeof Blob !== "undefined" && audioSource instanceof Blob) {
      blobToUpload = audioSource;
    } else if (typeof audioSource === "string") {
      if (audioSource.startsWith("blob:") && typeof window !== "undefined") {
        try {
          const res = await fetch(audioSource);
          if (res.ok) {
            blobToUpload = await res.blob();
          }
        } catch (e) {
          console.warn("Could not fetch blob URL:", e);
        }
      }
      if (!blobToUpload) {
        blobToUpload = dataUrlToBlob(audioSource, mimeType);
      }
    }

    if (!blobToUpload) {
      console.warn("uploadAudioFile: Failed to generate audio Blob from input");
      return null;
    }

    // Try primary bucket 'incident-media', fallback to 'audio-reports'
    const bucketsToTry = ["incident-media", "audio-reports"];
    for (const bucket of bucketsToTry) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, blobToUpload, {
            contentType: mimeType,
            cacheControl: "3600",
            upsert: true
          });

        if (!error && (data?.path || data?.Key || fileName)) {
          const storedPath = data?.path || fileName;
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(storedPath);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        } else if (error) {
          console.warn(`Supabase Storage upload to '${bucket}' error:`, error.message);
        }
      } catch (uploadErr) {
        console.warn(`Storage exception for bucket '${bucket}':`, uploadErr);
      }
    }
  } catch (err) {
    console.error("uploadAudioFile exception:", err);
  }

  // Never return raw base64 or blob strings to prevent 413 database payload errors
  return null;
};

/**
 * Upload a captured photo to Supabase Storage bucket 'incident-media'
 * Appends Date.now() to ensure a unique filename and returns ONLY the lightweight public URL string.
 */
export const uploadPhotoFile = async (photoSource, incidentId = "incident") => {
  if (!isSupabaseConfigured || !supabase || !photoSource) return null;

  if (
    typeof photoSource === "string" &&
    (photoSource.startsWith("http://") || photoSource.startsWith("https://")) &&
    photoSource.length <= 1024
  ) {
    return photoSource;
  }

  try {
    const cleanId = String(incidentId).replace(/[^a-zA-Z0-9_-]/g, "") || "photo";
    const fileName = `photos/photo_${cleanId}_${Date.now()}.jpg`;
    const mimeType = "image/jpeg";

    let blobToUpload = null;
    if (typeof Blob !== "undefined" && photoSource instanceof Blob) {
      blobToUpload = photoSource;
    } else if (typeof photoSource === "string") {
      if (photoSource.startsWith("blob:") && typeof window !== "undefined") {
        try {
          const res = await fetch(photoSource);
          if (res.ok) {
            blobToUpload = await res.blob();
          }
        } catch (e) {
          console.warn("Could not fetch blob URL:", e);
        }
      }
      if (!blobToUpload) {
        blobToUpload = dataUrlToBlob(photoSource, mimeType);
      }
    }

    if (!blobToUpload) return null;

    const { data, error } = await supabase.storage
      .from("incident-media")
      .upload(fileName, blobToUpload, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true
      });

    if (!error && (data?.path || fileName)) {
      const storedPath = data?.path || fileName;
      const { data: publicUrlData } = supabase.storage
        .from("incident-media")
        .getPublicUrl(storedPath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else if (error) {
      console.warn("Supabase Storage photo upload notice:", error.message);
    }
  } catch (err) {
    console.error("uploadPhotoFile exception:", err);
  }

  return null;
};

export const supabaseService = {
  isConfigured: () => isSupabaseConfigured,

  /**
   * Dedicated upload helper for audio files to Supabase Storage
   */
  uploadAudioFile: uploadAudioFile,

  /**
   * Dedicated upload helper for photos to Supabase Storage
   */
  uploadPhotoFile: uploadPhotoFile,

  /**
   * Generic upload media router (delegates to uploadAudioFile or uploadPhotoFile)
   */
  uploadMedia: async (mediaData, incidentId, type = "photo") => {
    return type === "audio"
      ? uploadAudioFile(mediaData, incidentId)
      : uploadPhotoFile(mediaData, incidentId);
  },

  /**
   * Fetch all incidents from Supabase ordered by created_at DESC (excludes archived/legacy demo incidents)
   */
  fetchIncidents: async () => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .neq("status", "Archived")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase fetchIncidents notice:", error.message);
        return null;
      }

      return Array.isArray(data)
        ? data
            .filter(
              (row) =>
                row.status !== "Archived" &&
                row.status !== "Deleted" &&
                !row.id.startsWith("INC-2026-00") &&
                row.id !== "TEST-INIT-001" &&
                row.id !== "JEEVA-2026-TEST"
            )
            .map(mapRowToIncident)
        : [];
    } catch (err) {
      console.warn("Supabase fetch exception:", err);
      return null;
    }
  },

  /**
   * Delete or archive an incident in Supabase
   */
  deleteIncident: async (id) => {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      await supabase.from("incidents").update({ status: "Archived" }).eq("id", id);
      await supabase.from("incidents").delete().eq("id", id);
      return true;
    } catch (e) {
      console.warn("Delete incident error:", e);
      return false;
    }
  },

  /**
   * Remove/archive all incidents in Supabase
   */
  clearAllIncidents: async () => {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { data } = await supabase.from("incidents").select("id");
      if (data && data.length > 0) {
        for (const row of data) {
          await supabase.from("incidents").update({ status: "Archived" }).eq("id", row.id);
          await supabase.from("incidents").delete().eq("id", row.id);
        }
      }
      return true;
    } catch (e) {
      console.warn("Clear all incidents error:", e);
      return false;
    }
  },

  /**
   * Insert a new incident into Supabase, uploading photos and audio to storage first
   */
  insertIncident: async (incident) => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      let photoUrl = incident.photoUrl;
      let audioUrl = incident.audioBlob || incident.audioUrl || incident.audioBase64;

      // 1. Upload photo to Supabase Storage bucket 'incident-media'
      if (photoUrl && !photoUrl.startsWith("http://") && !photoUrl.startsWith("https://")) {
        photoUrl = await uploadPhotoFile(photoUrl, incident.id);
      }

      // 2. Upload audio to Supabase Storage bucket 'incident-media' / 'audio-reports'
      if (audioUrl && !audioUrl.startsWith("http://") && !audioUrl.startsWith("https://")) {
        audioUrl = await uploadAudioFile(audioUrl, incident.id);
      }

      const row = mapIncidentToRow({
        ...incident,
        photoUrl,
        audioUrl
      });

      let { data, error } = await supabase
        .from("incidents")
        .insert([row])
        .select();

      if (error && error.message && (error.message.includes("citizen_id") || error.code === "42703")) {
        delete row.citizen_id;
        const retry = await supabase
          .from("incidents")
          .insert([row])
          .select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn("Supabase insertIncident error:", error.message);
        return null;
      }

      return data && data[0] ? mapRowToIncident(data[0]) : incident;
    } catch (err) {
      console.warn("Supabase insert exception:", err);
      return null;
    }
  },

  /**
   * Update an incident in Supabase (status, assigned unit, etc.)
   */
  updateIncident: async (id, updates) => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.assignedUnit !== undefined) payload.assigned_unit = updates.assignedUnit;
      if (updates.priorityScore !== undefined) payload.priority_score = updates.priorityScore;

      if (updates.photoUrl !== undefined) {
        let photo = updates.photoUrl;
        if (photo && !photo.startsWith("http://") && !photo.startsWith("https://")) {
          photo = await uploadPhotoFile(photo, id);
        }
        if (photo && typeof photo === "string" && photo.startsWith("http") && photo.length <= 1024) {
          payload.photo_url = photo;
        }
      }

      if (updates.audioUrl !== undefined || updates.audioBlob !== undefined || updates.audioBase64 !== undefined) {
        let audio = updates.audioBlob || updates.audioUrl || updates.audioBase64;
        if (audio && !audio.startsWith("http://") && !audio.startsWith("https://")) {
          audio = await uploadAudioFile(audio, id);
        }
        if (audio && typeof audio === "string" && audio.startsWith("http") && audio.length <= 1024) {
          payload.audio_url = audio;
        }
      }

      if (updates.peopleCount !== undefined) payload.people_count = updates.peopleCount;
      if (updates.corroboratingReportsCount !== undefined) payload.corroborating_reports_count = updates.corroboratingReportsCount;

      const { data, error } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) {
        console.warn("Supabase updateIncident error:", error.message);
        return null;
      }

      return data && data[0] ? mapRowToIncident(data[0]) : null;
    } catch (err) {
      console.warn("Supabase update exception:", err);
      return null;
    }
  },

  /**
   * Subscribe to real-time incident insertions and updates
   */
  subscribeToIncidents: (onInsert, onUpdate) => {
    if (!isSupabaseConfigured || !supabase) return () => {};

    try {
      const channel = supabase
        .channel("public:incidents")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incidents" },
          (payload) => {
            if (
              payload.new &&
              payload.new.status !== "Archived" &&
              payload.new.status !== "Deleted" &&
              !payload.new.id.startsWith("INC-2026-00") &&
              payload.new.id !== "TEST-INIT-001" &&
              payload.new.id !== "JEEVA-2026-TEST" &&
              onInsert
            ) {
              onInsert(mapRowToIncident(payload.new));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "incidents" },
          (payload) => {
            if (payload.new && onUpdate) {
              onUpdate(mapRowToIncident(payload.new));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Supabase realtime subscription failed:", err);
      return () => {};
    }
  },

  /**
   * Fetch incidents submitted by a specific citizen session
   */
  fetchIncidentsByCitizenId: async (citizenId) => {
    if (!isSupabaseConfigured || !supabase || !citizenId) return [];
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .neq("status", "Archived")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("fetchIncidentsByCitizenId error:", error.message);
        return [];
      }
      return Array.isArray(data)
        ? data
            .map(mapRowToIncident)
            .filter((inc) => inc && (inc.citizenId === citizenId || inc.location?.citizen_id === citizenId))
        : [];
    } catch (err) {
      console.warn("fetchIncidentsByCitizenId exception:", err);
      return [];
    }
  },

  /**
   * Subscribe to real-time status updates for a citizen's incidents
   */
  subscribeToCitizenIncidents: (citizenId, onUpdate) => {
    if (!isSupabaseConfigured || !supabase) return () => {};
    try {
      const channel = supabase
        .channel(`citizen-live-updates`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "incidents" },
          (payload) => {
            if (payload.new && onUpdate) {
              const inc = mapRowToIncident(payload.new);
              onUpdate(inc);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Citizen realtime subscription failed:", err);
      return () => {};
    }
  }
};
