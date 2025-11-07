
import React from 'react';
import { Faculty } from '../types';
import { DeleteIcon } from './Icons';

interface FacultySetupProps {
  faculty: Faculty[];
  setFaculty: React.Dispatch<React.SetStateAction<Faculty[]>>;
}

const FacultySetup: React.FC<FacultySetupProps> = ({ faculty, setFaculty }) => {
  const addFaculty = () => {
    setFaculty([
      ...faculty,
      {
        id: `f${Date.now()}`,
        name: '',
        maxHoursPerDay: 4,
        maxConsecutiveHours: 2,
      },
    ]);
  };

  const updateFaculty = (id: string, field: keyof Faculty, value: string | number) => {
    setFaculty(
      faculty.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const removeFaculty = (id: string) => {
    setFaculty(faculty.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700">Manage Faculty</h2>
        <button onClick={addFaculty} className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 transition-colors">
          Add Faculty
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faculty.map((f) => (
          <div key={f.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <button
              onClick={() => removeFaculty(f.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Remove faculty ${f.name}`}
            >
              <DeleteIcon className="h-5 w-5" />
            </button>
            <div className="space-y-4">
              <div>
                <label htmlFor={`name-${f.id}`} className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                <input
                  id={`name-${f.id}`}
                  type="text"
                  placeholder="e.g., Dr. John Doe"
                  value={f.name}
                  onChange={(e) => updateFaculty(f.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900"
                />
              </div>
              <div>
                <label htmlFor={`max-hours-${f.id}`} className="block text-sm font-medium text-gray-600 mb-1">Max Hours / Day</label>
                <input
                  id={`max-hours-${f.id}`}
                  type="number"
                  min="1"
                  max="5"
                  value={f.maxHoursPerDay}
                  onChange={(e) => updateFaculty(f.id, 'maxHoursPerDay', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900"
                />
              </div>
              <div>
                <label htmlFor={`consecutive-hours-${f.id}`} className="block text-sm font-medium text-gray-600 mb-1">Max Consecutive Hours</label>
                <input
                  id={`consecutive-hours-${f.id}`}
                  type="number"
                  min="1"
                  max="5"
                  value={f.maxConsecutiveHours}
                  onChange={(e) => updateFaculty(f.id, 'maxConsecutiveHours', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacultySetup;
