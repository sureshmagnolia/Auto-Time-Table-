import React, { useState, useMemo } from 'react';

export const StatisticsViewer = ({ teachers, classes, subjects, lessons, generatedCards, timeOffs }) => {
  const TOTAL_SLOTS = 25; // 5 days * 5 periods

  const [groupLevels, setGroupLevels] = useState(['teacherId', 'classId', '']);

  const resolveName = (type, id) => {
    if (id === 'UNASSIGNED') return 'Unassigned';
    if (type === 'teacherId') return teachers.find(t => t.id === id)?.name || id;
    if (type === 'classId') return classes.find(c => c.id === id)?.name || id;
    if (type === 'subjectId') return subjects.find(s => s.id === id)?.name || id;
    return id;
  };

  const buildTree = (currentLessons, currentCards, levels, depth = 0) => {
    if (levels.length === 0) {
      return { 
        totalRequired: currentLessons.reduce((sum, l) => sum + l.periods, 0),
        totalPlaced: currentCards.length
      };
    }

    const currentLevel = levels[0];
    const remainingLevels = levels.slice(1);
    const groups = {};

    const addEntity = (key, item, type) => {
      if (!key) return;
      if (!groups[key]) groups[key] = { lessons: [], cards: [] };
      if (type === 'lesson' && !groups[key].lessons.find(l => l.id === item.id)) {
        groups[key].lessons.push(item);
      }
      if (type === 'card' && !groups[key].cards.find(c => c.id === item.id)) {
        groups[key].cards.push(item);
      }
    };

    currentLessons.forEach(l => {
      if (currentLevel === 'teacherId') {
        const ts = l.teachers && l.teachers.length > 0 ? l.teachers : [{id: 'UNASSIGNED'}];
        ts.forEach(t => addEntity(t.id, l, 'lesson'));
      } else {
        addEntity(l[currentLevel], l, 'lesson');
      }
    });

    currentCards.forEach(c => {
      if (currentLevel === 'teacherId') {
        const ts = c.teachers && c.teachers.length > 0 ? c.teachers : [{id: 'UNASSIGNED'}];
        ts.forEach(t => addEntity(t.id, c, 'card'));
      } else {
        addEntity(c[currentLevel], c, 'card');
      }
    });

    const result = { 
      totalRequired: currentLessons.reduce((sum, l) => sum + l.periods, 0), 
      totalPlaced: currentCards.length, 
      children: {}, 
      type: currentLevel 
    };

    for (const [key, groupData] of Object.entries(groups)) {
      result.children[key] = buildTree(groupData.lessons, groupData.cards, remainingLevels, depth + 1);
    }
    
    return result;
  };

  const activeLevels = groupLevels.filter(Boolean);
  const reportTree = useMemo(() => buildTree(lessons, generatedCards, activeLevels), [lessons, generatedCards, activeLevels]);

  const RenderNode = ({ nodeKey, node, depth, nodeType }) => {
    const [isOpen, setIsOpen] = useState(depth === 0); // Open top level by default

    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const name = resolveName(nodeType, nodeKey);
    const isComplete = node.totalRequired === node.totalPlaced;
    let statusColor = isComplete ? 'var(--success)' : 'var(--warning)';

    let displayMetrics = null;

    if (nodeType === 'classId' && depth === 0) {
      const offSlots = (timeOffs && timeOffs[nodeKey]) ? timeOffs[nodeKey].length : 0;
      const available = TOTAL_SLOTS - offSlots;
      const remaining = available - node.totalRequired;
      if (remaining < 0) statusColor = 'var(--danger)';
      
      displayMetrics = (
        <div className="flex gap-4 items-center">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Available: <strong style={{color: 'white'}}>{available}h</strong></span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Assigned: <strong style={{color: 'white'}}>{node.totalRequired}h</strong></span>
          <span style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>Free: <strong style={{color: remaining < 0 ? 'var(--danger)' : 'white'}}>{remaining}h</strong></span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Placed: <strong style={{color: 'white'}}>{node.totalPlaced}h</strong></span>
          <span style={{ color: statusColor, fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>
            {remaining < 0 ? 'Math Impossible' : (isComplete ? 'Complete' : `Missing ${node.totalRequired - node.totalPlaced}`)}
          </span>
        </div>
      );
    } else {
      const label = nodeType === 'teacherId' ? 'Workload' : 'Assigned';
      displayMetrics = (
        <div className="flex gap-4 items-center">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}: <strong style={{color: 'white'}}>{node.totalRequired}h</strong></span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Placed: <strong style={{color: 'white'}}>{node.totalPlaced}h</strong></span>
          <span style={{ color: statusColor, fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>
            {isComplete ? 'Complete' : `Missing ${node.totalRequired - node.totalPlaced}`}
          </span>
        </div>
      );
    }

    return (
      <div style={{ marginLeft: depth > 0 ? '24px' : '0', marginTop: '8px' }}>
        <div 
          className="glass-panel flex justify-between items-center" 
          style={{ 
            padding: '12px 16px', 
            cursor: hasChildren ? 'pointer' : 'default', 
            borderLeft: `4px solid ${hasChildren ? 'var(--accent-purple)' : 'transparent'}`,
            background: depth === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
          }}
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            {hasChildren && <span style={{ width: '20px', color: 'var(--accent-blue)' }}>{isOpen ? '▼' : '▶'}</span>}
            {!hasChildren && <span style={{ width: '20px' }}>•</span>}
            <strong style={{ fontSize: depth === 0 ? '1.1rem' : '0.95rem' }}>{name}</strong>
          </div>
          {displayMetrics}
        </div>
        
        {isOpen && hasChildren && (
          <div style={{ paddingLeft: '8px', borderLeft: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            {Object.entries(node.children)
              .sort((a,b) => b[1].totalRequired - a[1].totalRequired) // Sort by required periods descending
              .map(([childKey, childNode]) => (
                <RenderNode key={childKey} nodeKey={childKey} node={childNode} depth={depth + 1} nodeType={node.type} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleLevelChange = (index, value) => {
    const newLevels = [...groupLevels];
    newLevels[index] = value;
    
    // Ensure we don't have duplicate groupings
    if (value !== '' && newLevels.filter((v, i) => v === value && i !== index).length > 0) {
      alert("You cannot group by the same category twice!");
      return;
    }
    
    setGroupLevels(newLevels);
  };

  const options = [
    { value: '', label: 'None' },
    { value: 'teacherId', label: 'Teacher' },
    { value: 'classId', label: 'Class' },
    { value: 'subjectId', label: 'Subject' }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '64px' }}>
      <h2 style={{ marginBottom: '24px' }}>Dynamic Statistics Engine</h2>
      
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️</span> Report Builder
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
          Select how you want to hierarchically group your school's data. Drill down up to 3 levels deep to generate complex workload matrixes instantly.
        </p>
        
        <div className="flex gap-4">
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>Level 1 (Primary)</label>
            <select className="input-field" value={groupLevels[0]} onChange={(e) => handleLevelChange(0, e.target.value)}>
              {options.filter(o => o.value !== '').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', color: 'var(--accent-pink)' }}>Level 2 (Secondary)</label>
            <select className="input-field" value={groupLevels[1]} onChange={(e) => handleLevelChange(1, e.target.value)}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>Level 3 (Tertiary)</label>
            <select className="input-field" value={groupLevels[2]} onChange={(e) => handleLevelChange(2, e.target.value)}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex justify-between items-center" style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <h3 style={{ color: 'var(--success)', margin: 0 }}>Generated Report</h3>
          <span style={{ color: 'var(--text-secondary)' }}>Total Required Workload: <strong style={{ color: 'white' }}>{reportTree.totalRequired} hours</strong></span>
        </div>
        
        {activeLevels.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Select at least one Group By level above to build the report.</p>
        ) : (
          <div style={{ marginTop: '16px' }}>
            {Object.entries(reportTree.children)
              .sort((a,b) => b[1].totalRequired - a[1].totalRequired) // Sort primarily by workload
              .map(([key, node]) => (
              <RenderNode key={key} nodeKey={key} node={node} depth={0} nodeType={reportTree.type} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
