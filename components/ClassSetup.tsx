
import React from 'react';
import { Class, Subject, Faculty } from '../types';
import { DAYS, PERIODS } from '../constants';
import { DeleteIcon, AddIcon } from './Icons';

interface ClassSetupProps {
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  facultyList: Faculty[];
}

const ClassSetup: React.FC<ClassSetupProps> = ({ classes, setClasses, facultyList }) => {
  const addClass = () => {
    setClasses([
      ...classes,
      {
        id: `c${Date.now()}`,
        name: '',
        subjects: [],
        unavailableSlots: [],
      },
    ]);
  };

  const updateClass = (id: string, name: string) => {
    setClasses(classes.map(c => (c.id === id ? { ...c, name } : c)));
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };
  
  const addSubject = (classId: string) => {
    const newSubject: Subject = { 
        id: `s${Date.now()}`, 
        name: '', 
        facultyId: facultyList[0]?.id || '', 
        weeklyHours: 3 
    };
    setClasses(classes.map(c => c.id === classId ? { ...c, subjects: [...c.subjects, newSubject] } : c));
  };

  const updateSubject = (classId: string, subjectId: string, field: keyof Subject, value: string | number) => {
      setClasses(classes.map(c => {
          if (c.id === classId) {
              const updatedSubjects = c.subjects.map(s => s.id === subjectId ? { ...s, [field]: value } : s);
              return { ...c, subjects: updatedSubjects };
          }
          return c;
      }));
  };
  
  const removeSubject = (classId: string, subjectId: string) => {
      setClasses(classes.map(c => c.id === classId ? { ...c, subjects: c.subjects.filter(s => s.id !== subjectId)} : c));
  };

  const toggleUnavailableSlot = (classId: string, day: string, period: number) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        const slotExists = c.unavailableSlots.some(s => s.day === day && s.period === period);
        const updatedSlots = slotExists
          ? c.unavailableSlots.filter(s => !(s.day === day && s.period === period))
          : [...c.unavailableSlots, { day, period }];
        return { ...c, unavailableSlots: updatedSlots };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700">Manage Classes, Subjects & Availability</h2>
        <button onClick={addClass} className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 transition-colors">
          Add Class
        </button>
      </div>
      <div className="space-y-8">
        {classes.map(c => (
          <div key={c.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <input
                type="text"
                placeholder="e.g., Computer Science Year 1"
                value={c.name}
                onChange={(e) => updateClass(c.id, e.target.value)}
                className="text-lg font-semibold border-b-2 border-gray-200 focus:border-primary focus:outline-none w-1/2 p-2 bg-white text-gray-900 rounded-t-md"
              />
              <button onClick={() => removeClass(c.id)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={`Remove class ${c.name}`}>
                <DeleteIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Subjects */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-600 mb-2">Subjects</h3>
              <div className="space-y-3">
                 {c.subjects.map(s => (
                    <div key={s.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <input type="text" placeholder="Subject Name" value={s.name} onChange={e => updateSubject(c.id, s.id, 'name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"/>
                        <select value={s.facultyId} onChange={e => updateSubject(c.id, s.id, 'facultyId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900">
                            {facultyList.length === 0 && <option>No faculty available</option>}
                            {facultyList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <input type="number" min="1" value={s.weeklyHours} onChange={e => updateSubject(c.id, s.id, 'weeklyHours', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                        <button onClick={() => removeSubject(c.id, s.id)} className="text-red-500 hover:text-red-700 justify-self-end" aria-label={`Remove subject ${s.name}`}><DeleteIcon/></button>
                    </div>
                 ))}
                 <button onClick={() => addSubject(c.id)} className="flex items-center space-x-2 text-sm text-primary hover:text-indigo-800 font-semibold mt-2">
                    <AddIcon/> <span>Add Subject</span>
                </button>
              </div>
            </div>

            {/* Unavailable Slots */}
            <div>
              <h3 className="text-md font-semibold text-gray-600 mb-2">Unavailable Slots (Time Off)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-1 font-medium">Day</th>
                      {PERIODS.map(p => <th key={p} className="py-2 px-1 font-medium">P{p}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day} className="border-b border-gray-200">
                        <td className="py-2 px-1 font-medium text-gray-600">{day}</td>
                        {PERIODS.map(period => {
                            const isUnavailable = c.unavailableSlots.some(s => s.day === day && s.period === period);
                            return (
                          <td key={period} className="py-2 px-1">
                            <button
                              onClick={() => toggleUnavailableSlot(c.id, day, period)}
                              className={`w-10 h-10 rounded-full transition-colors ${
                                isUnavailable
                                  ? 'bg-red-400 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              aria-label={`Toggle availability for ${day}, Period ${period}`}
                            >
                              {isUnavailable ? 'Off' : 'On'}
                            </button>
                          </td>
                        )})}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassSetup;
