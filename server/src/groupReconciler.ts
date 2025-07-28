export interface TravelerPreference {
  userId: string;
  preferences: string[];
}

export interface ReconciledPreferences {
  priorityList: string[];
  conflicts: Array<{ preference: string; supporters: number }>;
}

export interface ConsensusItinerary {
  itinerary: Array<{
    date: string;
    activities: Array<{ time: string; title: string; description: string }>;
  }>;
  notes: string[];
}

import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export function reconcilePreferences(preferences: TravelerPreference[]): ReconciledPreferences {
  const counts = new Map<string, number>();
  for (const pref of preferences) {
    for (const p of pref.preferences) {
      counts.set(p, (counts.get(p) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const priorityList = sorted.map(([p]) => p);
  const conflicts = sorted.filter(([_, count]) => count < preferences.length).map(([p, count]) => ({ preference: p, supporters: count }));

  return { priorityList, conflicts };
}

export async function generateConsensusItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  priorityList: string[]
): Promise<ConsensusItinerary> {
  try {
    const prompt = `Create a group travel itinerary for ${destination} from ${startDate} to ${endDate}.\nPreferences ranked by importance: ${priorityList.join(', ')}.\nRespond in JSON with {\n  \"itinerary\": [ { \"date\": \"YYYY-MM-DD\", \"activities\": [ { \"time\": \"HH:MM\", \"title\": \"Activity\", \"description\": \"Details\" } ] } ],\n  \"notes\": [\"General notes\"]\n}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Consensus itinerary generation failed:", error);
    return { itinerary: [], notes: ["Could not generate itinerary"] };
  }
}



