
export interface Faculty {
  id: string;
  name: string;
  maxHoursPerDay: number;
  maxConsecutiveHours: number;
}

export interface Subject {
  id: string;
  name:string;
  facultyId: string;
  weeklyHours: number;
}

export interface Class {
  id: string;
  name: string;
  subjects: Subject[];
  unavailableSlots: UnavailableSlot[];
}

export interface UnavailableSlot {
  day: string;
  period: number;
}

export interface TimetableSlot {
  subject: string;
  faculty: string;
}

export type TimetableDay = {
  [className: string]: {
    [period: string]: TimetableSlot | null;
  };
};

// FIX: Removed the problematic intersection with `{ error?: string }`.
// The TimetableData type now correctly represents only the timetable structure.
// Error handling is managed through a union type in the service function's return signature.
export type TimetableData = {
  [day: string]: TimetableDay;
};

export enum AppScreen {
    FACULTY_SETUP,
    CLASS_SETUP,
    TIMETABLE_VIEW,
}
