
import { GoogleGenAI, Type } from '@google/genai';
import { Faculty, Class, TimetableData } from '../types';

// FIX: Initialize the GoogleGenAI client directly with the environment variable
// as per the coding guidelines. The API key is assumed to be available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Update the return type to a union of TimetableData and an error object.
// This accurately reflects the two possible outcomes of the function.
export const generateTimetable = async (
  faculty: Faculty[],
  classes: Class[]
): Promise<TimetableData | { error: string }> => {
  const facultyForPrompt = faculty.map(({ id, ...rest }) => rest);
  const classesForPrompt = classes.map(c => ({
    name: c.name,
    subjects: c.subjects.map(s => ({
      name: s.name,
      weeklyHours: s.weeklyHours,
      facultyName: faculty.find(f => f.id === s.facultyId)?.name || 'Unknown',
    })),
    unavailableSlots: c.unavailableSlots,
  }));

  const prompt = `
    You are an expert timetabling system. Your task is to generate a 5-day weekly class schedule for a college based on the provided data and constraints. The schedule runs from Monday to Friday, with 5 periods each day.

    DATA:
    - Faculty: ${JSON.stringify(facultyForPrompt)}
    - Classes, Subjects, and Unavailability: ${JSON.stringify(classesForPrompt)}

    CONSTRAINTS:
    1. The timetable must cover 5 days: Monday, Tuesday, Wednesday, Thursday, Friday.
    2. Each day has 5 periods, numbered 1 through 5.
    3. The total number of periods allocated for each subject in the week must exactly match its 'weeklyHours'.
    4. A faculty member cannot teach more than their 'maxHoursPerDay'.
    5. A faculty member cannot teach more than their 'maxConsecutiveHours' in a row.
    6. A faculty member cannot be assigned to two different classes in the same period on the same day.
    7. A class cannot have two different subjects in the same period.
    8. Do not schedule any class during its specified unavailable slots.
    9. Distribute subjects for each class as evenly as possible throughout the week.

    OUTPUT FORMAT:
    Return the generated timetable as a JSON object. The JSON should be structured as: { "Day": { "ClassName": { "PeriodNumber": { "subject": "SubjectName", "faculty": "FacultyName" } } } }.
    For empty or unavailable slots, use \`null\`.
    If a valid timetable cannot be generated, return a JSON object with an "error" key: {"error": "A valid timetable could not be generated with the given constraints. Please check for conflicts."}.
    Do not add any explanations, just the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          responseMimeType: 'application/json',
      }
    });
    
    const textResponse = response.text.trim();
    const jsonResponse = JSON.parse(textResponse);

    if (jsonResponse.error) {
        return { error: jsonResponse.error };
    }
    
    // Normalize period keys to be strings like "Period 1"
    const formattedResponse: TimetableData = {};
    for (const day in jsonResponse) {
        formattedResponse[day] = {};
        for (const className in jsonResponse[day]) {
            formattedResponse[day][className] = {};
            for (const periodNum in jsonResponse[day][className]) {
                const periodKey = `Period ${periodNum}`;
                formattedResponse[day][className][periodKey] = jsonResponse[day][className][periodNum];
            }
        }
    }
    
    return formattedResponse;

  } catch (error) {
    console.error('Error generating timetable:', error);
    return { error: 'Failed to generate timetable due to an API or parsing error.' };
  }
};
