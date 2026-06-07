export const runDiagnostics = (lessons, teachers, classes, timeOffs, constraints) => {
  const issues = [];
  const TOTAL_SLOTS = 25;

  // Track required periods per entity
  const teacherLoad = {};
  const classLoad = {};

  lessons.forEach(l => {
    classLoad[l.classId] = (classLoad[l.classId] || 0) + l.periods;
    
    // Support legacy and multi-teacher
    const ts = l.teachers || (l.teacherId ? [{id: l.teacherId}] : []);
    ts.forEach(t => {
      teacherLoad[t.id] = (teacherLoad[t.id] || 0) + l.periods;
    });
  });

  // Check Teachers
  teachers.forEach(t => {
    const required = teacherLoad[t.id] || 0;
    const offSlots = (timeOffs[t.id] || []).length;
    
    let maxAllowed = TOTAL_SLOTS;
    let maxRule = constraints?.teachers?.[t.id]?.maxClassesPerDay || constraints?.global?.maxClassesPerDay;
    
    if (maxRule && maxRule.isStrict) {
      maxAllowed = maxRule.value * 5; // 5 days
    }

    const physicalCapacity = TOTAL_SLOTS - offSlots;
    const actualCapacity = Math.min(physicalCapacity, maxAllowed);

    if (required > actualCapacity) {
      issues.push({
        type: 'error',
        entityType: 'Teacher',
        entityName: t.name,
        message: `Assigned to teach ${required} periods, but only has ${actualCapacity} slots available. (Time-Offs: ${offSlots}, Max Per Day limit: ${maxRule?.value || 5})`,
        solution: `Reduce lessons by ${required - actualCapacity} periods, or remove time-off blocks.`
      });
    } else if (required > 0 && actualCapacity - required < 2) {
       issues.push({
        type: 'warning',
        entityType: 'Teacher',
        entityName: t.name,
        message: `Extremely tight schedule! ${required} periods assigned out of ${actualCapacity} available slots.`,
        solution: `This will drastically increase AI solving time. Consider removing 1-2 lesson periods.`
      });
    }
  });

  // Check Classes
  classes.forEach(c => {
    const required = classLoad[c.id] || 0;
    const offSlots = (timeOffs[c.id] || []).length;
    
    const physicalCapacity = TOTAL_SLOTS - offSlots;

    if (required > physicalCapacity) {
      issues.push({
        type: 'error',
        entityType: 'Class',
        entityName: c.name,
        message: `Requires ${required} periods of lessons, but only has ${physicalCapacity} slots available.`,
        solution: `Delete ${required - physicalCapacity} lesson periods for this class, or clear time-off blocks.`
      });
    }
  });

  return issues;
};
