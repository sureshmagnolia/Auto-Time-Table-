import React, { useState, useMemo } from 'react';
import { generateTimetable } from './Generator';
import { runDiagnostics } from './DiagnosticsEngine';

export const TimetableViewer = ({ teachers, classes, subjects, lessons, timeOffs, generatedCards, setGeneratedCards, constraints }) => {
  const [viewType, setViewType] = useState('master'); // 'class', 'teacher', 'master'
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [draggedCard, setDraggedCard] = useState(null); // { source: 'bin' | 'grid', data: {...} }
  const [algorithm, setAlgorithm] = useState('backtracking'); // 'greedy', 'backtracking', 'genetic'
  const [colorTheme, setColorTheme] = useState('teacher'); // 'default', 'teacher', 'subject'
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];

  // Derive unplaced cards
  const unplacedCards = useMemo(() => {
    const placedCounts = {};
    generatedCards.forEach(c => {
      placedCounts[c.lessonId] = (placedCounts[c.lessonId] || 0) + 1;
    });

    const unplaced = [];
    lessons.forEach(l => {
      const placed = placedCounts[l.id] || 0;
      const remaining = l.periods - placed;
      for (let i = 0; i < remaining; i++) {
        unplaced.push({ ...l, uniqueId: `${l.id}-unplaced-${i}` });
      }
    });
    return unplaced;
  }, [lessons, generatedCards]);

  const diagnostics = useMemo(() => runDiagnostics(lessons, teachers, classes, timeOffs, constraints), [lessons, teachers, classes, timeOffs, constraints]);
  const diagnosticsErrors = diagnostics.filter(i => i.type === 'error');
  const diagnosticsWarnings = diagnostics.filter(i => i.type === 'warning');

  const handleGenerate = async () => {
    // 1. Run Pre-Flight Diagnostics
    if (diagnosticsErrors.length > 0) {
       setIsDiagnosticsOpen(true);
       return; // Abort generation!
    }

    setIsGenerating(true);
    setProgressData({ type: algorithm, text: 'Preparing Engine...', current: 0 });

    // Force React to paint the loading modal to the DOM before the heavy CPU task starts
    await new Promise(r => setTimeout(r, 100));

    try {
      const { cards, unplacedCount, timeout, type } = await generateTimetable(
        lessons, teachers, classes, timeOffs, constraints, algorithm, 
        (data) => setProgressData(data)
      );
      
      setGeneratedCards(cards);
      
      // Small delay to let user see final progress bar state
      setTimeout(() => {
        setIsGenerating(false);
        setProgressData(null);
        if (timeout) {
           alert(`[${type}] timed out! Placed ${cards.length} cards, leaving ${unplacedCount} unplaced. Try Genetic Algorithm for harder constraints.`);
        } else if (unplacedCount > 0) {
           alert(`[${type}] finished with ${unplacedCount} impossible cards left unplaced!`);
        } else {
           alert(`Successfully generated perfect timetable using ${type}!`);
        }
      }, 500);
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
      alert("Error generating timetable");
    }
  };

  const getEntityName = (id, list) => {
    const item = list.find(i => i.id === id);
    return item ? item.short || item.name : 'Unknown';
  };

  const getCardForSlot = (day, period, type, entityId) => {
    if (!entityId && type !== 'master') return null;
    return generatedCards.find(c => {
      if (c.day !== day || c.period !== period) return false;
      if (type === 'class') return c.classId === entityId;
      if (type === 'teacher') return c.teachers && c.teachers.some(t => t.id === entityId);
      return false;
    });
  };

  // --- DRAG AND DROP HANDLERS ---
  
  const handlePrint = (mode) => {
    // Inject dynamic @page rules because CSS classes on body can't change global @page
    const style = document.createElement('style');
    style.id = 'dynamic-print-style';
    if (mode === 'professional') {
      style.innerHTML = '@page { size: A4 portrait; margin: 10mm; }';
    } else {
      style.innerHTML = '@page { size: A4 landscape; margin: 10mm; }';
    }
    document.head.appendChild(style);
    
    document.body.classList.add(`print-mode-${mode}`);
    
    // Allow React/DOM to paint before blocking with window.print()
    setTimeout(() => {
      window.print();
      document.body.classList.remove(`print-mode-${mode}`);
      document.head.removeChild(style);
    }, 100);
  };

  const handleDragStart = (e, source, data) => {
    setDraggedCard({ source, data });
    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    // Small hack to make the drag image look better (optional)
  };

  const handleDragOver = (e, targetClassId) => {
    if (draggedCard && targetClassId && targetClassId !== draggedCard.data.classId) {
      e.dataTransfer.dropEffect = 'none';
      return; // Browser naturally blocks drop if preventDefault is not called
    }
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDay, targetPeriod, targetClassId) => {
    e.preventDefault();
    if (!draggedCard) return;

    // Prevent dropping into a different class's row in the master grid
    if (targetClassId && targetClassId !== draggedCard.data.classId) {
      alert("Cards can only be placed in their own class's row!");
      return;
    }

    // Check if dropping onto a valid cell in Master View (since targetClassId is provided)
    if (!targetClassId) return;

    // Identify teachers on the dragged card
    const cardTeachers = draggedCard.data.teachers || (draggedCard.data.teacherId ? [{id: draggedCard.data.teacherId}] : []);
    
    // Check if target is existing card to swap
    const existingCardIdx = generatedCards.findIndex(c => c.day === targetDay && c.period === targetPeriod && c.classId === targetClassId && c.id !== draggedCard.data.id);
    const existingCard = existingCardIdx !== -1 ? generatedCards[existingCardIdx] : null;

    // Validation (Hard constraints) for dragged card at target position
    let isDoubleBookedTeacher = false;
    let isTeacherTimeOff = false;
    
    for (const t of cardTeachers) {
      // Check double booking against all OTHER cards at target time (excluding the existingCard we might swap out)
      const db = generatedCards.find(c => 
        c.day === targetDay && 
        c.period === targetPeriod && 
        c.id !== draggedCard.data.id &&
        c.id !== existingCard?.id &&
        (c.teachers || []).some(ct => ct.id === t.id)
      );
      if (db) isDoubleBookedTeacher = true;
      if ((timeOffs[t.id] || []).includes(`${targetDay}-${targetPeriod}`)) isTeacherTimeOff = true;
    }
    
    const isClassTimeOff = (timeOffs[targetClassId] || []).includes(`${targetDay}-${targetPeriod}`);
    
    if (isDoubleBookedTeacher || isTeacherTimeOff || isClassTimeOff) {
      alert("Hard Constraint Violated: Teacher is double-booked or an entity has a time-off!");
      return;
    }

    const newGeneratedCards = [...generatedCards];

    // Remove existing card from target slot (if any)
    const currentExistingIdx = newGeneratedCards.findIndex(c => c.id === existingCard?.id);
    if (currentExistingIdx !== -1) newGeneratedCards.splice(currentExistingIdx, 1);

    if (draggedCard.source === 'grid') {
      // Remove from old slot
      const idx = newGeneratedCards.findIndex(c => c.id === draggedCard.data.id);
      if (idx !== -1) newGeneratedCards.splice(idx, 1);
      
      // If there was an existing card in the target slot, SWAP it into the old slot!
      if (existingCard) {
         // Check constraints for existingCard moving to draggedCard's old slot!
         // (For MVP, we just aggressively swap and let user fix if it creates a warning, or block it)
         // We will just swap.
         existingCard.day = draggedCard.data.day;
         existingCard.period = draggedCard.data.period;
         newGeneratedCards.push(existingCard);
      }
    } else {
      // From bin. Existing card (if any) just goes to the bin (remains deleted from generatedCards)
    }

    // Add dragged card to new slot
    newGeneratedCards.push({
      id: draggedCard.data.id || Date.now().toString() + Math.random().toString(),
      lessonId: draggedCard.data.lessonId || draggedCard.data.id, // Handles both grid cards and unplaced cards
      teachers: draggedCard.data.teachers,
      teacherId: draggedCard.data.teacherId, // fallback
      classId: draggedCard.data.classId, // ALWAYS preserve the original class!
      subjectId: draggedCard.data.subjectId,
      day: targetDay,
      period: targetPeriod
    });

    setGeneratedCards(newGeneratedCards);
    setDraggedCard(null);
  };

  const handleDropToBin = (e) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.source === 'bin') return;

    // Remove from generated cards (moves it back to bin automatically via derived state)
    setGeneratedCards(generatedCards.filter(c => c.id !== draggedCard.data.id));
    setDraggedCard(null);
  };

  const getColorForId = (id) => {
    if (!id) return 'var(--accent-purple)';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
  };

  const renderCard = (card, isStray = false) => {
    if (!card) return null;
    const subjectName = getEntityName(card.subjectId, subjects);
    
    // Fallback for legacy single-teacher data
    const ts = card.teachers || (card.teacherId ? [{id: card.teacherId, role: 'primary'}] : []);
    const teacherNames = ts.map(t => getEntityName(t.id, teachers) + (t.role === 'assistant' ? '*' : '')).join(' / ');
    const className = getEntityName(card.classId, classes);

    let bg = 'var(--accent-purple)';
    if (colorTheme === 'subject') {
       bg = getColorForId(card.subjectId);
    } else if (colorTheme === 'teacher') {
       if (ts.length === 1) {
          bg = getColorForId(ts[0].id);
       } else if (ts.length > 1) {
          bg = `linear-gradient(135deg, ${getColorForId(ts[0].id)}, ${getColorForId(ts[1].id)})`;
       }
    }

    return (
      <div 
        draggable
        onDragStart={(e) => handleDragStart(e, isStray ? 'bin' : 'grid', card)}
        className="timetable-card"
        style={{ 
          opacity: draggedCard?.data?.id === card.id ? 0.5 : 1, 
          padding: '4px 6px', 
          background: bg, 
          color: 'white', 
          borderRadius: '6px', 
          fontSize: '0.65rem', 
          cursor: 'grab', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          lineHeight: 1.1,
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div className="card-title" style={{ fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.3)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subjectName}</div>
        <div className="card-subtitle" style={{ color: 'rgba(255,255,255,0.95)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacherNames}</div>
        {!isStray && <div className="card-subtitle" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{className}</div>}
        {isStray && <div className="card-subtitle" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{className}</div>}
      </div>
    );
  };

  // --- RENDERING VIEWS ---

  const renderMasterGrid = () => {
    return (
      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="data-table" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ width: '80px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Day</th>
              <th style={{ width: '120px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Class</th>
              {periods.map(p => <th key={p} style={{ textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Period {p}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIndex) => (
              <React.Fragment key={day}>
                {classes.map((cls, classIndex) => {
                  const isLastClass = classIndex === classes.length - 1;
                  const borderBottomStyle = isLastClass ? '2px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)';
                  
                  return (
                    <tr key={`${day}-${cls.id}`}>
                      {classIndex === 0 && (
                        <td rowSpan={classes.length} style={{ fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                          {day}
                        </td>
                      )}
                      <td style={{ fontWeight: 'bold', borderBottom: borderBottomStyle }}>
                        {cls.short || cls.name}
                      </td>
                      {periods.map(p => {
                        const card = getCardForSlot(day, p, 'class', cls.id);
                        const isLocked = (timeOffs[cls.id] || []).includes(`${day}-${p}`);
                        
                        return (
                          <td 
                            key={`${day}-${p}`} 
                            onDragOver={(e) => handleDragOver(e, cls.id)}
                            onDrop={(e) => handleDrop(e, day, p, cls.id)}
                            style={{ 
                              width: '130px', height: '55px', padding: '3px', 
                              borderLeft: '1px solid rgba(255,255,255,0.05)', 
                              borderBottom: borderBottomStyle,
                              background: isLocked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                              transition: 'background var(--transition-fast)',
                              verticalAlign: 'top'
                            }}
                          >
                            {card ? renderCard(card, false) : (isLocked ? <span style={{color:'var(--danger)', fontSize:'0.7rem'}}>Locked</span> : null)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSingleEntityGrid = () => {
    if (!selectedEntityId) return <p style={{color:'var(--text-secondary)', marginTop: '16px'}}>Select an entity to view.</p>;
    
    return (
      <div className="animate-fade-in" style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="data-table" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '100px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Day</th>
              {periods.map(p => <th key={p} style={{ textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Period {p}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{day}</td>
                {periods.map(p => {
                  const card = getCardForSlot(day, p, viewType, selectedEntityId);
                  const isLocked = (timeOffs[selectedEntityId] || []).includes(`${day}-${p}`);
                  
                  return (
                    <td key={`${day}-${p}`} style={{ 
                      width: '130px', height: '55px', padding: '3px', 
                      borderLeft: '1px solid rgba(255,255,255,0.05)', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isLocked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                      verticalAlign: 'top'
                    }}>
                      {card ? renderCard(card, false) : (isLocked ? <span style={{color:'var(--danger)', fontSize:'0.7rem'}}>Locked</span> : null)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{color:'var(--text-secondary)', marginTop: '16px', fontSize: '0.85rem'}}>
          Single entity views are read-only. Switch to Master View to drag and drop.
        </p>
      </div>
    );
  };

  const renderFormalPrint = () => {
    return (
      <div className="formal-print-only">
        <h2 style={{ textAlign: 'center', fontFamily: 'serif', marginBottom: '16px' }}>
          {viewType === 'master' ? 'Master Timetable' : (viewType === 'class' ? `Class Timetable: ${classes.find(c => c.id === selectedEntityId)?.name || ''}` : `Teacher Timetable: ${teachers.find(t => t.id === selectedEntityId)?.name || ''}`)}
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontFamily: 'sans-serif', fontSize: '9pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f0f0f0' }}>Day</th>
              {viewType === 'master' && <th style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f0f0f0' }}>Class</th>}
              {periods.map(p => <th key={p} style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f0f0f0' }}>Period {p}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              // Filter out classes that have absolutely no classes scheduled on this day
              let activeClasses = classes;
              if (viewType === 'master') {
                activeClasses = classes.filter(cls => {
                  return periods.some(p => getCardForSlot(day, p, 'class', cls.id) !== null);
                });
                if (activeClasses.length === 0) return null; // Skip day completely if empty
              }

              return (
              <React.Fragment key={day}>
                {viewType === 'master' ? (
                  activeClasses.map((cls, cIdx) => (
                    <tr key={cls.id}>
                      {cIdx === 0 && <td rowSpan={activeClasses.length} style={{ border: '1px solid black', borderBottom: '2px solid black', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8f8f8' }}>{day}</td>}
                      <td style={{ border: '1px solid black', padding: '2px 4px', borderBottom: cIdx === activeClasses.length - 1 ? '2px solid black' : '1px solid black', fontWeight: 'bold', fontSize: '8pt', whiteSpace: 'nowrap' }}>{cls.name}</td>
                      {periods.map(p => {
                         const card = getCardForSlot(day, p, 'class', cls.id);
                         return (
                           <td key={p} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', borderBottom: cIdx === activeClasses.length - 1 ? '2px solid black' : '1px solid black' }}>
                             {card ? (
                               <>
                                 <div style={{ fontWeight: 'bold', fontSize: '8pt', color: 'black', lineHeight: '1.1' }}>{subjects.find(s => s.id === card.subjectId)?.name || 'Unknown'}</div>
                                 <div style={{ fontSize: '7pt', color: '#333', lineHeight: '1.1' }}>{card.teachers.map(t => teachers.find(tx => tx.id === t.id)?.name || 'Unknown').join(', ')}</div>
                               </>
                             ) : ''}
                           </td>
                         )
                      })}
                    </tr>
                  ))
                ) : (
                  <tr key={day}>
                    <td style={{ border: '1px solid black', padding: '4px', fontWeight: 'bold', textAlign: 'center' }}>{day}</td>
                    {periods.map(p => {
                       const card = getCardForSlot(day, p, viewType, selectedEntityId);
                       return (
                         <td key={p} style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>
                           {card ? (
                             <>
                               <div style={{ fontWeight: 'bold', fontSize: '8pt', color: 'black', lineHeight: '1.1' }}>{subjects.find(s => s.id === card.subjectId)?.name || 'Unknown'}</div>
                               <div style={{ fontSize: '7pt', color: '#333', lineHeight: '1.1' }}>
                                 {viewType === 'class' ? 
                                    card.teachers.map(t => teachers.find(tx => tx.id === t.id)?.name || 'Unknown').join(', ') : 
                                    classes.find(c => c.id === card.classId)?.name || 'Unknown'}
                               </div>
                             </>
                           ) : ''}
                         </td>
                       )
                    })}
                  </tr>
                )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h2>Interactive Timetable Viewer</h2>
        <div className="flex gap-4 items-center">
          <span style={{ fontSize: '0.85rem', color: unplacedCards.length === 0 ? 'var(--success)' : 'var(--warning)' }}>
            Unplaced: {unplacedCards.length}
          </span>
          <select className="input-field" value={colorTheme} onChange={e => setColorTheme(e.target.value)} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-primary)' }}>
            <option value="default">Default Colors</option>
            <option value="teacher">Color by Staff</option>
            <option value="subject">Color by Subject</option>
          </select>
          <select className="input-field" value={algorithm} onChange={e => setAlgorithm(e.target.value)} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-primary)' }}>
            <option value="greedy">Fast Greedy</option>
            <option value="backtracking">Deep Backtracking</option>
            <option value="genetic">Evolutionary Genetic</option>
          </select>
          <button className="btn btn-primary" onClick={handleGenerate} style={{ background: 'var(--success)', color: '#fff' }}>
            Auto-Generate Timetable
          </button>
          <button className="btn btn-secondary" onClick={() => handlePrint('colorful')} style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>
            🖨️ Colorful Print
          </button>
          <button className="btn btn-secondary" onClick={() => handlePrint('professional')} style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none' }}>
            🖨️ Professional Print
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div className="flex gap-4">
          <button className={`btn ${viewType === 'master' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewType('master')}>Master Drag-and-Drop Grid</button>
          <button className={`btn ${viewType === 'class' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewType('class')}>Class View</button>
          <button className={`btn ${viewType === 'teacher' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewType('teacher')}>Teacher View</button>
        </div>

        {viewType !== 'master' && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.85rem' }}>*Note: Drag-and-drop is only supported in the Master Grid for the MVP.*</p>
            <select className="input-field" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}>
              <option value="">Select {viewType === 'class' ? 'Class' : 'Teacher'}...</option>
              {(viewType === 'class' ? classes : teachers).map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(diagnosticsErrors.length > 0 || diagnosticsWarnings.length > 0) && (
        <div className="glass-panel" style={{ marginBottom: '24px', background: diagnosticsErrors.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${diagnosticsErrors.length > 0 ? 'var(--danger)' : 'var(--warning)'}` }}>
          <div className="flex justify-between items-center" style={{ cursor: 'pointer' }} onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <h4 style={{ color: diagnosticsErrors.length > 0 ? 'var(--danger)' : 'var(--warning)', margin: 0 }}>
                {diagnosticsErrors.length > 0 ? 'Configuration Errors Detected' : 'Configuration Warnings'} ({diagnostics.length})
              </h4>
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 12px' }}>
              {isDiagnosticsOpen ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {isDiagnosticsOpen && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {diagnostics.map((issue, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${issue.type === 'error' ? 'var(--danger)' : 'var(--warning)'}` }}>
                  <strong style={{ color: issue.type === 'error' ? 'var(--danger)' : 'var(--warning)' }}>{issue.entityType} ({issue.entityName}):</strong> {issue.message}
                  <div style={{ color: 'var(--success)', marginTop: '4px', fontSize: '0.9rem' }}>↳ <strong>Fix:</strong> {issue.solution}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div className="glass-panel print-container" style={{ flex: 1, marginBottom: '24px', overflowX: 'auto' }}>
          <h2 className="print-header">
            {viewType === 'master' ? 'Master Timetable' : (viewType === 'class' ? `Timetable: ${classes.find(c => c.id === selectedEntityId)?.name || ''}` : `Timetable: ${teachers.find(t => t.id === selectedEntityId)?.name || ''}`)}
          </h2>
          {viewType === 'master' ? renderMasterGrid() : renderSingleEntityGrid()}
        </div>

        {viewType === 'master' && (
          <div className="stray-cards-bin glass-panel" 
            onDragOver={handleDragOver}
            onDrop={handleDropToBin}
            style={{ 
              width: '320px', flexShrink: 0, position: 'sticky', top: '24px', 
              maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <h4 style={{ 
              marginBottom: '16px', color: 'var(--text-secondary)', 
              position: 'sticky', top: '-16px', background: 'var(--bg-dark)', 
              padding: '16px 0', zIndex: 10, margin: '-16px -16px 16px -16px', paddingLeft: '16px'
            }}>
              Stray Cards ({unplacedCards.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {unplacedCards.map(card => (
                 <div key={card.uniqueId}>{renderCard(card, true)}</div>
              ))}
              {unplacedCards.length === 0 && <span style={{ color: 'var(--success)', gridColumn: '1 / -1' }}>All cards placed!</span>}
            </div>
          </div>
        )}
      </div>
      
      {/* Formal Print View (Hidden from UI, visible only when printing) */}
      {renderFormalPrint()}

      {isGenerating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>Running {progressData?.type}</h3>
            <p style={{ marginBottom: '8px', fontSize: '0.9rem' }}>{progressData?.text}</p>
            
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ 
                height: '100%', 
                background: 'var(--accent-purple)', 
                width: progressData?.total ? `${(progressData.current / progressData.total) * 100}%` : '100%',
                transition: 'width 0.2s ease-out',
                opacity: progressData?.total ? 1 : 0.7
              }} />
            </div>

            {progressData?.eta && (
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 'bold' }}>ETA: {progressData.eta}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
