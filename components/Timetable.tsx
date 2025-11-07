
import React from 'react';
import { TimetableData } from '../types';
import { DAYS, PERIODS } from '../constants';

interface TimetableProps {
  timetableData: TimetableData;
  classNames: string[];
}

const Timetable: React.FC<TimetableProps> = ({ timetableData, classNames }) => {

  const facultyColors: { [key: string]: string } = {};
  const colorPalette = [
    'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800', 'bg-orange-100 text-orange-800',
  ];
  let colorIndex = 0;

  const getFacultyColor = (facultyName: string) => {
    if (!facultyColors[facultyName]) {
      facultyColors[facultyName] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
    return facultyColors[facultyName];
  };

  if (!timetableData || Object.keys(timetableData).length === 0) {
    return <p>No timetable data to display.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 font-semibold text-left text-gray-600 border-b border-gray-200 w-24">Day</th>
            <th className="p-3 font-semibold text-left text-gray-600 border-b border-gray-200 w-32">Class</th>
            {PERIODS.map(period => (
              <th key={period} className="p-3 font-semibold text-center text-gray-600 border-b border-gray-200">
                Period {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, dayIndex) => (
            <React.Fragment key={day}>
              {classNames.map((className, classIndex) => (
                <tr key={`${day}-${className}`} className={classIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {classIndex === 0 && (
                    <td
                      className="p-3 font-bold text-primary border-r border-gray-200 align-middle text-center"
                      rowSpan={classNames.length}
                    >
                      {day}
                    </td>
                  )}
                  <td className="p-3 font-semibold text-gray-700 border-r border-gray-200">{className}</td>
                  {PERIODS.map(period => {
                    const slot = timetableData[day]?.[className]?.[`Period ${period}`];
                    return (
                      <td key={period} className="p-2 border-b border-gray-200 align-top">
                        {slot ? (
                          <div className={`p-2 rounded-md h-full flex flex-col justify-center ${getFacultyColor(slot.faculty)}`}>
                            <p className="font-bold">{slot.subject}</p>
                            <p className="text-xs">{slot.faculty}</p>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {dayIndex < DAYS.length - 1 && (
                  <tr className="h-2 bg-gray-200"><td colSpan={PERIODS.length + 2}></td></tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Timetable;
