import { useState } from 'react';

export const ConstraintsManager = ({ teachers, constraints, setConstraints }) => {
  const [activeTab, setActiveTab] = useState('global');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const handleGlobalChange = (key, field, value) => {
    setConstraints({
      ...constraints,
      global: {
        ...constraints.global,
        [key]: { ...constraints.global[key], [field]: value }
      }
    });
  };

  const handleTeacherChange = (teacherId, key, field, value) => {
    const teacherData = constraints.teachers[teacherId] || {};
    const keyData = teacherData[key] || { value: '', isStrict: false };
    
    setConstraints({
      ...constraints,
      teachers: {
        ...constraints.teachers,
        [teacherId]: {
          ...teacherData,
          [key]: { ...keyData, [field]: value }
        }
      }
    });
  };

  const handleTimePreference = (teacherId, day, period, prefType) => {
    const teacherData = constraints.teachers[teacherId] || {};
    const timePrefs = teacherData.timePreferences || {};
    const slotKey = `${day}-${period}`;
    
    let newPrefs = { ...timePrefs };
    if (newPrefs[slotKey] === prefType) {
      delete newPrefs[slotKey]; // Toggle off
    } else {
      newPrefs[slotKey] = prefType;
    }

    setConstraints({
      ...constraints,
      teachers: {
        ...constraints.teachers,
        [teacherId]: { ...teacherData, timePreferences: newPrefs }
      }
    });
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];

  const renderRuleRow = (label, key, data, onChange) => (
    <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1 }}>
        <strong>{label}</strong>
      </div>
      <div className="flex items-center gap-4">
        {typeof data.value === 'boolean' ? (
          <select className="input-field" value={data.value} onChange={e => onChange(key, 'value', e.target.value === 'true')}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        ) : (
          <input type="number" min="0" className="input-field" style={{ width: '80px' }} value={data.value} onChange={e => onChange(key, 'value', parseInt(e.target.value) || 0)} />
        )}
        <select className="input-field" value={data.isStrict} onChange={e => onChange(key, 'isStrict', e.target.value === 'true')}>
          <option value="true">Strict (Hard)</option>
          <option value="false">Optional (Soft)</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 style={{ marginBottom: '24px' }}>Advanced Constraints</h2>
      
      <div className="flex gap-4" style={{ marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'global' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('global')}>Global Rules</button>
        <button className={`btn ${activeTab === 'teacher' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('teacher')}>Teacher Rules & Preferences</button>
      </div>

      {activeTab === 'global' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px' }}>Global Scheduling Rules</h3>
          {renderRuleRow("Min Classes Per Day", "minClassesPerDay", constraints.global.minClassesPerDay, handleGlobalChange)}
          {renderRuleRow("Max Classes Per Day", "maxClassesPerDay", constraints.global.maxClassesPerDay, handleGlobalChange)}
          {renderRuleRow("Max Consecutive Hours", "maxConsecutive", constraints.global.maxConsecutive, handleGlobalChange)}
          {renderRuleRow("Uniform 1st/Last Hour Distribution", "uniformDistribution", constraints.global.uniformDistribution, handleGlobalChange)}
        </div>
      )}

      {activeTab === 'teacher' && (
        <div className="glass-card">
          <select className="input-field" style={{ marginBottom: '24px', width: '100%' }} value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
            <option value="">Select a Teacher to configure overrides...</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {selectedTeacher && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '16px' }}>Teacher Overrides</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>If a value is left at 0, the Global Rule will be applied.</p>
              
              <div className="glass-panel" style={{ marginBottom: '24px' }}>
                {renderRuleRow("Min Classes Per Day", "minClassesPerDay", constraints.teachers[selectedTeacher]?.minClassesPerDay || { value: 0, isStrict: false }, (k, f, v) => handleTeacherChange(selectedTeacher, k, f, v))}
                {renderRuleRow("Max Classes Per Day", "maxClassesPerDay", constraints.teachers[selectedTeacher]?.maxClassesPerDay || { value: 0, isStrict: false }, (k, f, v) => handleTeacherChange(selectedTeacher, k, f, v))}
                {renderRuleRow("Max Consecutive Hours", "maxConsecutive", constraints.teachers[selectedTeacher]?.maxConsecutive || { value: 0, isStrict: false }, (k, f, v) => handleTeacherChange(selectedTeacher, k, f, v))}
              </div>

              <h3 style={{ marginBottom: '16px' }}>Morning / Afternoon Preferences</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>
                Click a cell to cycle through: <span style={{color: 'var(--success)'}}>Prefer (Green)</span>, <span style={{color: 'var(--warning)'}}>Avoid (Yellow)</span>, Neutral (Clear).<br/>
                *Note: To completely LOCK a period, use the Time-Offs tab.*
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '80px' }}></div>
                  {periods.map(p => <div key={p} style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>P{p}</div>)}
                </div>
                {days.map(day => (
                  <div key={day} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '80px', fontWeight: 'bold' }}>{day}</div>
                    {periods.map(period => {
                      const pref = (constraints.teachers[selectedTeacher]?.timePreferences || {})[`${day}-${period}`];
                      let bg = 'rgba(255,255,255,0.05)';
                      if (pref === 'prefer') bg = 'rgba(16, 185, 129, 0.4)';
                      if (pref === 'avoid') bg = 'rgba(245, 158, 11, 0.4)';
                      
                      return (
                        <button
                          key={period}
                          onClick={() => {
                            if (!pref) handleTimePreference(selectedTeacher, day, period, 'prefer');
                            else if (pref === 'prefer') handleTimePreference(selectedTeacher, day, period, 'avoid');
                            else handleTimePreference(selectedTeacher, day, period, null);
                          }}
                          style={{
                            width: '100px', height: '60px', borderRadius: 'var(--border-radius-sm)',
                            border: '1px solid rgba(255,255,255,0.1)', background: bg, cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          {pref === 'prefer' ? 'Prefer' : pref === 'avoid' ? 'Avoid' : '-'}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
