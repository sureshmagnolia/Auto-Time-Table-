import { useState } from 'react';
import './index.css';
import { useLocalStorage } from './useLocalStorage';
import { initialData } from './initialData';
import { TimetableViewer } from './TimetableViewer';
import { ConstraintsManager } from './ConstraintsManager';
import { StatisticsViewer } from './StatisticsViewer';
import { parseAscXml } from './xmlParser';

// Dashboard component
const Dashboard = ({ stats, onLoadTestData, onExportData, onImportData, onImportXml }) => (
  <div className="animate-fade-in">
    <div className="flex justify-between items-center">
      <h2>Dashboard</h2>
      <div className="flex gap-2">
        <input type="file" id="importXmlFile" style={{ display: 'none' }} accept=".xml" onChange={onImportXml} />
        <button className="btn btn-primary" onClick={() => document.getElementById('importXmlFile').click()} style={{ background: 'var(--accent-purple)' }}>
          Import aSc XML
        </button>
        <input type="file" id="importFile" style={{ display: 'none' }} accept=".json" onChange={onImportData} />
        <button className="btn btn-secondary" onClick={() => document.getElementById('importFile').click()}>
          Import JSON
        </button>
        <button className="btn btn-secondary" onClick={onExportData}>
          Export JSON
        </button>
        <button className="btn btn-primary" onClick={onLoadTestData}>
          Load Test Data
        </button>
      </div>
    </div>
    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Welcome to aSc Timetables Clone.</p>
    <div className="grid grid-cols-4" style={{ marginTop: '24px' }}>
      <div className="glass-card">
        <h3>Total Teachers</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{stats.teachers}</p>
      </div>
      <div className="glass-card">
        <h3>Total Classes</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{stats.classes}</p>
      </div>
      <div className="glass-card">
        <h3>Total Subjects</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-pink)' }}>{stats.subjects}</p>
      </div>
      <div className="glass-card">
        <h3>Total Lessons</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.lessons}</p>
      </div>
    </div>
  </div>
);

// Generic CRUD Manager for basic entities
const CrudManager = ({ title, data, setData, columns }) => {
  const [newItem, setNewItem] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState({});

  const handleAdd = () => {
    if (Object.keys(newItem).length === 0 || !newItem.name) return;
    setData([...data, { id: Date.now().toString(), ...newItem }]);
    setNewItem({});
  };

  const handleDelete = (id) => {
    setData(data.filter(item => item.id !== id));
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditItem(item);
  };

  const handleSaveEdit = () => {
    setData(data.map(item => item.id === editingId ? editItem : item));
    setEditingId(null);
    setEditItem({});
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h2>{title}</h2>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px' }}>Add New {title.slice(0, -1)}</h4>
        <div className="flex gap-4 items-center">
          {columns.map(col => (
            <input
              key={col.key}
              type="text"
              className="input-field"
              placeholder={col.label}
              value={newItem[col.key] || ''}
              onChange={(e) => setNewItem({ ...newItem, [col.key]: e.target.value })}
            />
          ))}
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      <div className="glass-panel">
        {data.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No {title.toLowerCase()} found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  {editingId === item.id ? (
                    <>
                      {columns.map(col => (
                        <td key={col.key}>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={editItem[col.key] || ''} 
                            onChange={e => setEditItem({ ...editItem, [col.key]: e.target.value })} 
                          />
                        </td>
                      ))}
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: '8px' }} onClick={handleSaveEdit}>Save</button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      {columns.map(col => <td key={col.key}>{item[col.key]}</td>)}
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', marginRight: '8px' }} onClick={() => handleEditClick(item)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDelete(item.id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Lessons Manager (Maps Teacher, Subject, Class, etc.)
const LessonsManager = ({ lessons, setLessons, teachers, subjects, classes, classrooms }) => {
  const defaultLesson = { teachers: [], subjectId: '', classId: '', classroomId: '', periods: 1 };
  const [newLesson, setNewLesson] = useState(defaultLesson);
  const [editingId, setEditingId] = useState(null);
  const [tempTeacherId, setTempTeacherId] = useState('');
  const [tempRole, setTempRole] = useState('primary');

  const handleAddTeacher = () => {
    if (!tempTeacherId) return;
    if (newLesson.teachers.some(t => t.id === tempTeacherId)) return alert("Teacher already added to this lesson");
    setNewLesson({
      ...newLesson,
      teachers: [...newLesson.teachers, { id: tempTeacherId, role: tempRole }]
    });
    setTempTeacherId('');
  };

  const handleRemoveTeacher = (id) => {
    setNewLesson({
      ...newLesson,
      teachers: newLesson.teachers.filter(t => t.id !== id)
    });
  };

  const handleSave = () => {
    if (newLesson.teachers.length === 0 || !newLesson.subjectId || !newLesson.classId) return alert('Please select at least one Teacher, Subject, and Class');
    if (editingId) {
      setLessons(lessons.map(l => l.id === editingId ? { ...newLesson, id: editingId } : l));
      setEditingId(null);
    } else {
      setLessons([...lessons, { id: Date.now().toString(), ...newLesson }]);
    }
    setNewLesson(defaultLesson);
  };

  const handleEditClick = (lesson) => {
    setEditingId(lesson.id);
    const ts = lesson.teachers || (lesson.teacherId ? [{id: lesson.teacherId, role: 'primary'}] : []);
    setNewLesson({ ...lesson, teachers: ts });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setLessons(lessons.filter(item => item.id !== id));
  };

  const getName = (id, collection) => {
    const item = collection.find(i => i.id === id);
    return item ? item.name : 'Unknown';
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ marginBottom: '24px' }}>Lessons</h2>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', color: editingId ? 'var(--warning)' : 'inherit' }}>
          {editingId ? 'Edit Lesson' : 'Create Lesson (Card)'}
        </h4>
        
        <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <h5 style={{ marginBottom: '8px' }}>Assign Teachers (Co-Teaching / Assisting)</h5>
          <div className="flex gap-4 items-center" style={{ marginBottom: '8px' }}>
            <select className="input-field" value={tempTeacherId} onChange={(e) => setTempTeacherId(e.target.value)}>
              <option value="">Select Teacher...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input-field" value={tempRole} onChange={(e) => setTempRole(e.target.value)}>
              <option value="primary">Primary (Shared)</option>
              <option value="assistant">Assistant</option>
            </select>
            <button className="btn btn-secondary" onClick={handleAddTeacher}>Add Teacher</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {newLesson.teachers.map(t => (
              <span key={t.id} style={{ background: t.role === 'primary' ? 'var(--accent-blue)' : 'var(--accent-purple)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getName(t.id, teachers)} ({t.role})
                <button onClick={() => handleRemoveTeacher(t.id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>x</button>
              </span>
            ))}
            {newLesson.teachers.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No teachers assigned yet.</span>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '16px' }}>
          <select className="input-field" value={newLesson.subjectId} onChange={(e) => setNewLesson({ ...newLesson, subjectId: e.target.value })}>
            <option value="">Select Subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input-field" value={newLesson.classId} onChange={(e) => setNewLesson({ ...newLesson, classId: e.target.value })}>
            <option value="">Select Class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input-field" value={newLesson.classroomId} onChange={(e) => setNewLesson({ ...newLesson, classroomId: e.target.value })}>
            <option value="">Select Classroom (Opt)...</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
             <span style={{color: 'var(--text-secondary)'}}>Periods/Week:</span>
             <input type="number" min="1" max="10" className="input-field" style={{ width: '80px' }} value={newLesson.periods} onChange={(e) => setNewLesson({ ...newLesson, periods: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="flex gap-2">
             <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update Lesson' : 'Add Lesson'}</button>
             {editingId && <button className="btn btn-secondary" onClick={() => { setEditingId(null); setNewLesson(defaultLesson); }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="glass-panel">
        {lessons.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No lessons found. Create one above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Teachers</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Classroom</th>
                <th>Periods</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(lesson => {
                // Handle legacy data fallback gracefully
                const ts = lesson.teachers || (lesson.teacherId ? [{id: lesson.teacherId, role: 'primary'}] : []);
                return (
                  <tr key={lesson.id}>
                    <td>
                      {ts.map(t => <div key={t.id} style={{fontSize: '0.8rem'}}>{getName(t.id, teachers)} <span style={{opacity:0.7}}>({t.role})</span></div>)}
                    </td>
                    <td>{getName(lesson.subjectId, subjects)}</td>
                    <td>{getName(lesson.classId, classes)}</td>
                    <td>{lesson.classroomId ? getName(lesson.classroomId, classrooms) : 'Any'}</td>
                    <td>{lesson.periods}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', marginRight: '8px' }} onClick={() => handleEditClick(lesson)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDelete(lesson.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Time-off Manager
const TimeOffManager = ({ teachers, classes, timeOffs, setTimeOffs }) => {
  const [selectedType, setSelectedType] = useState('teacher');
  const [selectedEntity, setSelectedEntity] = useState('');

  const entities = selectedType === 'teacher' ? teachers : classes;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];

  const handleToggle = (day, period) => {
    if (!selectedEntity) return;
    
    // timeOffs structure: { [entityId]: ["Mon-1", "Tue-3"] }
    const key = `${day}-${period}`;
    const entityTimeOffs = timeOffs[selectedEntity] || [];
    
    let newEntityTimeOffs;
    if (entityTimeOffs.includes(key)) {
      newEntityTimeOffs = entityTimeOffs.filter(k => k !== key);
    } else {
      newEntityTimeOffs = [...entityTimeOffs, key];
    }
    
    setTimeOffs({ ...timeOffs, [selectedEntity]: newEntityTimeOffs });
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ marginBottom: '24px' }}>Time-Offs (Constraints)</h2>
      
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select an entity and click the grid cells to toggle availability. 
          <br/> <span style={{ color: 'var(--success)' }}>Green = Available</span>, <span style={{ color: 'var(--danger)' }}>Red = Locked</span>
        </p>
        <div className="flex gap-4">
          <select className="input-field" value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSelectedEntity(''); }}>
            <option value="teacher">Teachers</option>
            <option value="class">Classes</option>
          </select>
          <select className="input-field" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}>
            <option value="">Select {selectedType}...</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {selectedEntity ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
             <div style={{ width: '80px' }}></div>
             {periods.map(p => <div key={p} style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Period {p}</div>)}
          </div>
          {days.map(day => (
            <div key={day} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '80px', fontWeight: 'bold' }}>{day}</div>
              {periods.map(period => {
                const key = `${day}-${period}`;
                const isLocked = (timeOffs[selectedEntity] || []).includes(key);
                return (
                  <button
                    key={period}
                    onClick={() => handleToggle(day, period)}
                    style={{
                      width: '100px',
                      height: '60px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: isLocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {isLocked ? 'Locked' : 'Free'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>Please select a teacher or class to configure time-offs.</p>
      )}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [teachers, setTeachers] = useLocalStorage('app-teachers', []);
  const [classes, setClasses] = useLocalStorage('app-classes', []);
  const [subjects, setSubjects] = useLocalStorage('app-subjects', []);
  const [classrooms, setClassrooms] = useLocalStorage('app-classrooms', []);
  
  // Phase 2 State
  const [lessons, setLessons] = useLocalStorage('app-lessons', []);
  const [timeOffs, setTimeOffs] = useLocalStorage('app-timeoffs', {}); // { entityId: ["Mon-1", "Tue-2"] }

  // Phase 3, 4, 5 State
  const [generatedCards, setGeneratedCards] = useLocalStorage('app-generated-cards', []);
  const [constraints, setConstraints] = useLocalStorage('app-advanced-constraints', {
    global: {
      maxClassesPerDay: { value: 5, isStrict: true },
      minClassesPerDay: { value: 1, isStrict: false },
      maxConsecutive: { value: 3, isStrict: true },
      uniformDistribution: { value: true, isStrict: false }
    },
    teachers: {}
  });

  const stats = {
    teachers: teachers.length,
    classes: classes.length,
    subjects: subjects.length,
    lessons: lessons.length
  };

  const handleLoadTestData = () => {
    if (window.confirm("This will overwrite your current data with the XML test data. Proceed?")) {
      setTeachers(initialData.teachers);
      setClasses(initialData.classes);
      setSubjects(initialData.subjects);
      setClassrooms(initialData.classrooms);
      setLessons(initialData.lessons);
      alert("Test data loaded successfully!");
    }
  };

  const handleExportData = () => {
    const exportData = {
      teachers, classes, subjects, classrooms, lessons, timeOffs, constraints, generatedCards
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronogen-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.teachers && data.classes && data.lessons) {
          if (window.confirm("This will overwrite your current data with the imported JSON data. Proceed?")) {
            setTeachers(data.teachers || []);
            setClasses(data.classes || []);
            setSubjects(data.subjects || []);
            setClassrooms(data.classrooms || []);
            setLessons(data.lessons || []);
            setTimeOffs(data.timeOffs || {});
            setConstraints(data.constraints || { global: {}, teachers: {} });
            setGeneratedCards(data.generatedCards || []);
            alert("Data imported successfully!");
          }
        } else {
          alert("Invalid file format. Missing core data.");
        }
      } catch (err) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleImportXml = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = parseAscXml(event.target.result);
        if (parsedData.teachers.length > 0 && parsedData.classes.length > 0) {
          if (window.confirm(`Found ${parsedData.lessons.length} lessons! This will overwrite your current data. Proceed?`)) {
            setTeachers(parsedData.teachers);
            setClasses(parsedData.classes);
            setSubjects(parsedData.subjects);
            setClassrooms(parsedData.classrooms);
            setLessons(parsedData.lessons);
            // Reset state that doesn't match the new XML
            setGeneratedCards([]);
            alert("XML imported successfully! Shared lessons correctly mapped!");
          }
        } else {
          alert("Invalid XML format. Could not find teachers or classes.");
        }
      } catch (err) {
        alert("Error parsing XML file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} onLoadTestData={handleLoadTestData} onExportData={handleExportData} onImportData={handleImportData} onImportXml={handleImportXml} />;
      case 'teachers':
        return <CrudManager title="Teachers" data={teachers} setData={setTeachers} columns={[{ key: 'name', label: 'Name' }, { key: 'short', label: 'Short Name' }]} />;
      case 'classes':
        return <CrudManager title="Classes" data={classes} setData={setClasses} columns={[{ key: 'name', label: 'Name' }, { key: 'short', label: 'Short Name' }]} />;
      case 'subjects':
        return <CrudManager title="Subjects" data={subjects} setData={setSubjects} columns={[{ key: 'name', label: 'Name' }, { key: 'short', label: 'Short Name' }]} />;
      case 'classrooms':
        return <CrudManager title="Classrooms" data={classrooms} setData={setClassrooms} columns={[{ key: 'name', label: 'Name' }, { key: 'short', label: 'Short Name' }, { key: 'capacity', label: 'Capacity' }]} />;
      case 'lessons':
        return <LessonsManager lessons={lessons} setLessons={setLessons} teachers={teachers} subjects={subjects} classes={classes} classrooms={classrooms} />;
      case 'timeoffs':
        return <TimeOffManager teachers={teachers} classes={classes} timeOffs={timeOffs} setTimeOffs={setTimeOffs} />;
      case 'constraints':
        return <ConstraintsManager teachers={teachers} constraints={constraints} setConstraints={setConstraints} />;
      case 'statistics':
        return <StatisticsViewer teachers={teachers} classes={classes} subjects={subjects} lessons={lessons} generatedCards={generatedCards} timeOffs={timeOffs} />;
      case 'viewer':
        return <TimetableViewer teachers={teachers} classes={classes} subjects={subjects} lessons={lessons} timeOffs={timeOffs} generatedCards={generatedCards} setGeneratedCards={setGeneratedCards} constraints={constraints} />;
      default:
        return <Dashboard stats={stats} />;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'classes', label: 'Classes' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'classrooms', label: 'Classrooms' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'timeoffs', label: 'Time-offs (Hard Locks)' },
    { id: 'constraints', label: 'Advanced Constraints' },
    { id: 'statistics', label: 'Statistics' },
    { id: 'viewer', label: 'Timetable Viewer' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="glass-panel" style={{ width: '250px', borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none', display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
        <h1 style={{ padding: '0 24px', marginBottom: '48px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 9H21M9 21V9" stroke="currentColor" strokeWidth="2"/>
          </svg>
          ChronoGen
        </h1>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px' }}>
          <div style={{ padding: '0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>CORE DATA</div>
          {tabs.slice(0, 5).map(tab => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', padding: '12px 24px', border: 'none', background: activeTab === tab.id ? '' : 'transparent', boxShadow: 'none' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          
          <div style={{ padding: '0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em', marginTop: '16px', marginBottom: '8px' }}>SCHEDULING</div>
          {tabs.slice(5).map(tab => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', padding: '12px 24px', border: 'none', background: activeTab === tab.id ? '' : 'transparent', boxShadow: 'none' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '48px' }}>
        <div className="container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
