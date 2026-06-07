export const parseAscXml = (xmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid XML format. The file could not be parsed.");
  }

  const parseEntities = (tag) => {
    const nodes = doc.querySelectorAll(tag);
    return Array.from(nodes).map(node => ({
      id: node.getAttribute("id"),
      name: node.getAttribute("name"),
      short: node.getAttribute("short"),
      ...(tag === 'classroom' && { capacity: node.getAttribute("capacity") || '*' })
    }));
  };

  const teachers = parseEntities("teacher");
  const subjects = parseEntities("subject");
  const classes = parseEntities("class");
  const classrooms = parseEntities("classroom");

  // Parse raw lessons
  const lessonNodes = doc.querySelectorAll("lesson");
  const rawLessons = Array.from(lessonNodes).map(node => {
    // aSc uses comma-separated lists for multiple assigned entities
    const teacherIdsStr = node.getAttribute("teacherids") || "";
    const teacherIds = teacherIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    
    // Convert to array of {id, role} objects
    const mappedTeachers = teacherIds.map((tid, idx) => ({ 
      id: tid, 
      role: idx === 0 ? 'primary' : 'assistant' // By default, 1st is primary
    }));

    const classIdsStr = node.getAttribute("classids") || "";
    const classId = classIdsStr.split(',')[0]?.trim(); // For MVP, only support single primary class

    const classroomIdsStr = node.getAttribute("classroomids") || "";
    const classroomId = classroomIdsStr.split(',')[0]?.trim() || "";

    return {
      id: node.getAttribute("id"),
      subjectId: node.getAttribute("subjectid"),
      classId: classId,
      classroomId: classroomId,
      periodsStr: node.getAttribute("periodsperweek") || node.getAttribute("periods") || node.getAttribute("duration") || "1",
      teachers: mappedTeachers
    };
  });

  // Calculate integer periods with correct rounding for alternating weeks (e.g., 0.5 -> 1)
  rawLessons.forEach(l => {
    l.periods = Math.max(1, Math.round(parseFloat(l.periodsStr)));
  });

  // To accurately identify which lessons are actually combined shared lessons (taught simultaneously),
  // we look at the <cards> tag to see which lessons occupy the exact same day, period, and class!
  const cardsNodes = doc.querySelectorAll("card");
  const cardsByTimeAndClass = {};

  Array.from(cardsNodes).forEach(c => {
    const day = c.getAttribute("days");
    const period = c.getAttribute("period");
    const lessonId = c.getAttribute("lessonid");
    
    const lesson = rawLessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    const timeClassKey = `${day}-${period}-${lesson.classId}`;
    if (!cardsByTimeAndClass[timeClassKey]) {
      cardsByTimeAndClass[timeClassKey] = [];
    }
    cardsByTimeAndClass[timeClassKey].push(lessonId);
  });

  // Extract overlaps
  const overlapGroups = [];
  Object.values(cardsByTimeAndClass).forEach(lessonIds => {
    if (lessonIds.length > 1) {
      overlapGroups.push(lessonIds);
    }
  });

  // Merge lessons based on overlaps
  overlapGroups.forEach(group => {
    const baseId = group[0];
    const baseLesson = rawLessons.find(l => l.id === baseId);
    if (!baseLesson) return;

    for (let i = 1; i < group.length; i++) {
      const otherId = group[i];
      if (otherId === baseId) continue;

      const otherLessonIndex = rawLessons.findIndex(l => l.id === otherId);
      if (otherLessonIndex > -1) {
        const otherLesson = rawLessons[otherLessonIndex];
        
        // Merge teachers from otherLesson into baseLesson
        otherLesson.teachers.forEach(t => {
          if (!baseLesson.teachers.find(bt => bt.id === t.id)) {
            baseLesson.teachers.push({ id: t.id, role: 'assistant' });
          }
        });

        // Delete the other lesson since it's merged
        rawLessons.splice(otherLessonIndex, 1);
      }
    }
  });

  return { teachers, subjects, classes, classrooms, lessons: rawLessons };
};
