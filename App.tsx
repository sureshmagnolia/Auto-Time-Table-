
import React, { useState, useCallback } from 'react';
import { Faculty, Class, TimetableData, AppScreen } from './types';
import { DEFAULT_FACULTY, DEFAULT_CLASSES } from './constants';
import FacultySetup from './components/FacultySetup';
import ClassSetup from './components/ClassSetup';
import Timetable from './components/Timetable';
import { generateTimetable } from './services/geminiService';
import { LogoIcon, LoadingSpinner } from './components/Icons';

const App: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>(DEFAULT_FACULTY);
  const [classes, setClasses] = useState<Class[]>(DEFAULT_CLASSES);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.FACULTY_SETUP);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTimetable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTimetable(null);
    try {
      const result = await generateTimetable(faculty, classes);
      // FIX: Use a type-safe 'in' operator to check for the error property.
      // This correctly handles the union type returned by generateTimetable.
      if ('error' in result) {
        setError(result.error);
      } else {
        setTimetable(result);
        setCurrentScreen(AppScreen.TIMETABLE_VIEW);
      }
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [faculty, classes]);
  
  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.FACULTY_SETUP:
        return <FacultySetup faculty={faculty} setFaculty={setFaculty} />;
      case AppScreen.CLASS_SETUP:
        return <ClassSetup classes={classes} setClasses={setClasses} facultyList={faculty} />;
      case AppScreen.TIMETABLE_VIEW:
        return timetable ? <Timetable timetableData={timetable} classNames={classes.map(c => c.name)} /> : <p>No timetable generated.</p>;
      default:
        return null;
    }
  };

  const isSetupComplete = faculty.length > 0 && classes.length > 0 && classes.every(c => c.subjects.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <LogoIcon className="h-10 w-10 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
              Intelligent Timetable Generator
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row border-b border-gray-200 mb-6">
             <TabButton
              isActive={currentScreen === AppScreen.FACULTY_SETUP}
              onClick={() => setCurrentScreen(AppScreen.FACULTY_SETUP)}
              label="Step 1: Faculty"
            />
            <TabButton
              isActive={currentScreen === AppScreen.CLASS_SETUP}
              onClick={() => setCurrentScreen(AppScreen.CLASS_SETUP)}
              label="Step 2: Classes & Subjects"
            />
             <TabButton
              isActive={currentScreen === AppScreen.TIMETABLE_VIEW}
              onClick={() => setCurrentScreen(AppScreen.TIMETABLE_VIEW)}
              label="Step 3: View Timetable"
              disabled={!timetable}
            />
          </div>
          
          <div className="min-h-[400px]">
            {renderScreen()}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {error && <p className="text-red-600 text-sm text-center sm:text-left flex-grow">{error}</p>}
            <button
              onClick={handleGenerateTimetable}
              disabled={isLoading || !isSetupComplete}
              className={`w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                !isSetupComplete ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-indigo-700'
              } transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="h-5 w-5 mr-3" />
                  Generating...
                </>
              ) : (
                'Generate Timetable'
              )}
            </button>
          </div>
          {!isSetupComplete && (
             <p className="text-sm text-amber-600 mt-2 text-right">Please add faculty, classes, and subjects before generating.</p>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-text-light text-sm">
        <p>&copy; {new Date().getFullYear()} College Timetable Generator. All rights reserved.</p>
      </footer>
    </div>
  );
};

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    label: string;
    disabled?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, label, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`-mb-px py-3 px-4 sm:px-6 text-sm sm:text-base font-medium text-center border-b-2 transition-colors duration-200 ease-in-out focus:outline-none ${
            isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } disabled:text-gray-400 disabled:hover:border-transparent disabled:cursor-not-allowed`}
    >
        {label}
    </button>
);

export default App;
