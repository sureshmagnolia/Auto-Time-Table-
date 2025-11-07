
import { Faculty, Class } from './types';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const PERIODS = [1, 2, 3, 4, 5];

export const DEFAULT_FACULTY: Faculty[] = [
  { id: 'f1', name: 'Dr. Alan Turing', maxHoursPerDay: 4, maxConsecutiveHours: 2 },
  { id: 'f2', name: 'Dr. Grace Hopper', maxHoursPerDay: 3, maxConsecutiveHours: 2 },
  { id: 'f3', name: 'Dr. Ada Lovelace', maxHoursPerDay: 4, maxConsecutiveHours: 2 },
];

export const DEFAULT_CLASSES: Class[] = [
  {
    id: 'c1',
    name: 'CS101',
    subjects: [
      { id: 's1', name: 'Algorithms', facultyId: 'f1', weeklyHours: 4 },
      { id: 's2', name: 'Compilers', facultyId: 'f2', weeklyHours: 3 },
      { id: 's3', name: 'Data Structures', facultyId: 'f1', weeklyHours: 3 },
    ],
    unavailableSlots: [{ day: 'Wednesday', period: 3 }],
  },
  {
    id: 'c2',
    name: 'CS202',
    subjects: [
      { id: 's4', name: 'Operating Systems', facultyId: 'f2', weeklyHours: 3 },
      { id: 's5', name: 'Discrete Maths', facultyId: 'f3', weeklyHours: 4 },
      { id: 's6', name: 'Intro to AI', facultyId: 'f1', weeklyHours: 3 },
    ],
    unavailableSlots: [],
  },
];
