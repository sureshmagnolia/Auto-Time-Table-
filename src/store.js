import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { get, set, del } from 'idb-keyval';

// Custom storage engine for Zustand using IndexedDB
const idbStorage = {
  getItem: async (name) => {
    return (await get(name)) || null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export const useStore = create(
  temporal(
    persist(
      (set) => ({
        teachers: [],
        classes: [],
        subjects: [],
        classrooms: [],
        lessons: [],
        timeOffs: {},
        constraints: { global: {}, teachers: {} },
        generatedCards: [],
        
        setTeachers: (teachers) => set({ teachers }),
        setClasses: (classes) => set({ classes }),
        setSubjects: (subjects) => set({ subjects }),
        setClassrooms: (classrooms) => set({ classrooms }),
        setLessons: (lessons) => set({ lessons }),
        setTimeOffs: (timeOffs) => set({ timeOffs }),
        setConstraints: (constraints) => set({ constraints }),
        setGeneratedCards: (generatedCards) => set({ generatedCards }),
        
        clearAllData: () => set({
          teachers: [],
          classes: [],
          subjects: [],
          classrooms: [],
          lessons: [],
          timeOffs: {},
          constraints: { global: {}, teachers: {} },
          generatedCards: []
        }),
        
        importData: (data) => set({
          teachers: data.teachers || [],
          classes: data.classes || [],
          subjects: data.subjects || [],
          classrooms: data.classrooms || [],
          lessons: data.lessons || [],
          timeOffs: data.timeOffs || {},
          constraints: data.constraints || { global: {}, teachers: {} },
          generatedCards: data.generatedCards || []
        }),
      }),
      {
        name: 'chronogen-db',
        storage: createJSONStorage(() => idbStorage), // use IndexedDB
      }
    ),
    {
      // Only track these fields in the undo/redo history to save memory and skip core data edits
      partialize: (state) => ({ 
        generatedCards: state.generatedCards,
        timeOffs: state.timeOffs 
      }),
      limit: 50 // Keep up to 50 states in history
    }
  )
);
