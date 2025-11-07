
import React, { useState, useCallback, useEffect } from 'react';
import { Faculty, Class, TimetableData, AppScreen } from './types';
import { DEFAULT_FACULTY, DEFAULT_CLASSES } from './constants';
import FacultySetup from './components/FacultySetup';
import ClassSetup from './components/ClassSetup';
import Timetable from './components/Timetable';
import { generateTimetable } from './services/geminiService';
import { LogoIcon, LoadingSpinner } from './components/Icons';

const App: React.FC = () => {
  const [isApiKeyConfigured] = useState<boolean>(() => {
    // Basic check to see if the API key variable exists.
    // The Gemini client will perform the actual validation.
    return typeof process.env.API_KEY === 'string' && process.env.API_KEY.length > 0;
  });

  const [faculty, setFaculty] = useState<Faculty[]>(() => {
    try {
      const savedFaculty = localStorage.getItem('timetable_faculty');
      return savedFaculty ? JSON.parse(savedFaculty) : DEFAULT_FACULTY;
    } catch (error) {
      console.error('Failed to parse faculty from localStorage', error);
      return DEFAULT_FACULTY;
    }
  });

  const [classes, setClasses] = useState<Class[]>(() => {
    try {
      const savedClasses = localStorage.getItem('timetable_classes');
      return savedClasses ? JSON.parse(savedClasses) : DEFAULT_CLASSES;
    } catch (error) {
      console.error('Failed to parse classes from localStorage', error);
      return DEFAULT_CLASSES;
    }
  });
  
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.FACULTY_SETUP);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
        localStorage.setItem('timetable_faculty', JSON.stringify(faculty));
    } catch (error) {
        console.error('Failed to save faculty to localStorage', error);
    }
  }, [faculty]);

  useEffect(() => {
    try {
        localStorage.setItem('timetable_classes', JSON.stringify(classes));
    } catch (error) {
        console.error('Failed to save classes to localStorage', error);
    }
  }, [classes]);

  const handleGenerateTimetable = useCallback(async () => {
    if (!isApiKeyConfigured) {
        setError("API Key is not configured. Cannot generate timetable.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setTimetable(null);
    try {
      const result = await generateTimetable(faculty, classes);
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
  }, [faculty, classes, isApiKeyConfigured]);
  
  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data to the default examples? This will erase your current setup.')) {
        localStorage.removeItem('timetable_faculty');
        localStorage.removeItem('timetable_classes');
        setFaculty(DEFAULT_FACULTY);
        setClasses(DEFAULT_CLASSES);
        setTimetable(null);
        setCurrentScreen(AppScreen.FACULTY_SETUP);
        setError(null);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.FACULTY_SETUP:
        return <FacultySetup faculty={faculty} setFaculty={setFaculty} />;
      case AppScreen.CLASS_SETUP:
        return <ClassSetup classes={classes} setClasses={setClasses} facultyList={faculty} />;
      case AppScreen.TIMETABLE_VIEW:
        return timetable ? <Timetable timetableData={timetable} classNames={classes.map(c => c.name)} /> : <p>No timetable generated. Click "Generate Timetable" to begin.</p>;
      default:
        return null;
    }
  };

  const isSetupComplete = faculty.length > 0 && faculty.every(f => f.name) && classes.length > 0 && classes.every(c => c.name && c.subjects.length > 0 && c.subjects.every(s => s.name));

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
        {!isApiKeyConfigured && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
                <p className="font-bold">Configuration Error</p>
                <p>The Gemini API key is not available. Timetable generation is disabled. Please run this application in a valid environment where the API key is provided.</p>
            </div>
        )}
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
                onClick={handleResetData}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Reset Data
            </button>
            <button
              onClick={handleGenerateTimetable}
              disabled={isLoading || !isSetupComplete || !isApiKeyConfigured}
              className={`w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                !isSetupComplete || !isApiKeyConfigured ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-indigo-700'
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
          {(!isSetupComplete || !isApiKeyConfigured) && (
             <p className="text-sm text-amber-600 mt-2 text-right">
                {!isApiKeyConfigured ? 'API Key not configured. Generation is disabled.' : 'Please complete all fields for faculty, classes, and subjects.'}
             </p>
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
