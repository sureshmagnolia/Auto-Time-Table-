package com.chronogen.xml;

import com.chronogen.model.*;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class AscXmlParser {

    private static class ParsedLesson {
        String id;
        String subjectId;
        String classId;
        String classroomId;
        String periodsStr;
        int periods;
        List<TeacherAssignment> teachers = new ArrayList<>();
    }

    public static TimetableSolution parse(String xmlString) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        ByteArrayInputStream input = new ByteArrayInputStream(xmlString.getBytes(StandardCharsets.UTF_8));
        Document doc = builder.parse(input);

        // Maps for lookup
        Map<String, Teacher> teacherMap = new HashMap<>();
        Map<String, Subject> subjectMap = new HashMap<>();
        Map<String, Clazz> classMap = new HashMap<>();
        Map<String, Classroom> classroomMap = new HashMap<>();

        // Parse Teachers
        NodeList teacherNodes = doc.getElementsByTagName("teacher");
        for (int i = 0; i < teacherNodes.getLength(); i++) {
            Element node = (Element) teacherNodes.item(i);
            String id = node.getAttribute("id");
            String name = node.getAttribute("name");
            String shortName = node.getAttribute("short");
            teacherMap.put(id, new Teacher(id, name, shortName));
        }

        // Parse Subjects
        NodeList subjectNodes = doc.getElementsByTagName("subject");
        for (int i = 0; i < subjectNodes.getLength(); i++) {
            Element node = (Element) subjectNodes.item(i);
            String id = node.getAttribute("id");
            String name = node.getAttribute("name");
            String shortName = node.getAttribute("short");
            subjectMap.put(id, new Subject(id, name, shortName));
        }

        // Parse Classes
        NodeList classNodes = doc.getElementsByTagName("class");
        for (int i = 0; i < classNodes.getLength(); i++) {
            Element node = (Element) classNodes.item(i);
            String id = node.getAttribute("id");
            String name = node.getAttribute("name");
            String shortName = node.getAttribute("short");
            classMap.put(id, new Clazz(id, name, shortName));
        }

        // Parse Classrooms
        NodeList classroomNodes = doc.getElementsByTagName("classroom");
        for (int i = 0; i < classroomNodes.getLength(); i++) {
            Element node = (Element) classroomNodes.item(i);
            String id = node.getAttribute("id");
            String name = node.getAttribute("name");
            String shortName = node.getAttribute("short");
            String capacity = node.getAttribute("capacity");
            if (capacity == null || capacity.isEmpty()) {
                capacity = "*";
            }
            classroomMap.put(id, new Classroom(id, name, shortName, capacity));
        }

        // Parse Lessons
        NodeList lessonNodes = doc.getElementsByTagName("lesson");
        List<ParsedLesson> rawLessons = new ArrayList<>();
        for (int i = 0; i < lessonNodes.getLength(); i++) {
            Element node = (Element) lessonNodes.item(i);
            ParsedLesson pl = new ParsedLesson();
            pl.id = node.getAttribute("id");
            pl.subjectId = node.getAttribute("subjectid");

            String classIdsStr = node.getAttribute("classids");
            if (classIdsStr != null && !classIdsStr.isEmpty()) {
                pl.classId = classIdsStr.split(",")[0].trim();
            }

            String classroomIdsStr = node.getAttribute("classroomids");
            if (classroomIdsStr != null && !classroomIdsStr.isEmpty()) {
                pl.classroomId = classroomIdsStr.split(",")[0].trim();
            }

            String periods = node.getAttribute("periodsperweek");
            if (periods == null || periods.isEmpty()) {
                periods = node.getAttribute("periods");
            }
            if (periods == null || periods.isEmpty()) {
                periods = node.getAttribute("duration");
            }
            if (periods == null || periods.isEmpty()) {
                periods = "1";
            }
            pl.periodsStr = periods;

            try {
                pl.periods = Math.max(1, Math.round(Float.parseFloat(pl.periodsStr)));
            } catch (NumberFormatException e) {
                pl.periods = 1;
            }

            String teacherIdsStr = node.getAttribute("teacherids");
            if (teacherIdsStr != null && !teacherIdsStr.isEmpty()) {
                String[] tids = teacherIdsStr.split(",");
                for (int j = 0; j < tids.length; j++) {
                    String tid = tids[j].trim();
                    Teacher teacher = teacherMap.get(tid);
                    if (teacher != null) {
                        String role = (j == 0) ? "primary" : "assistant";
                        pl.teachers.add(new TeacherAssignment(teacher, role));
                    }
                }
            }
            rawLessons.add(pl);
        }

        // Parse Cards for overlapping combined classes
        NodeList cardNodes = doc.getElementsByTagName("card");
        Map<String, List<String>> cardsByTimeAndClass = new HashMap<>();
        for (int i = 0; i < cardNodes.getLength(); i++) {
            Element node = (Element) cardNodes.item(i);
            String day = node.getAttribute("days");
            String period = node.getAttribute("period");
            String lessonId = node.getAttribute("lessonid");

            ParsedLesson lesson = null;
            for (ParsedLesson pl : rawLessons) {
                if (pl.id.equals(lessonId)) {
                    lesson = pl;
                    break;
                }
            }
            if (lesson == null) {
                continue;
            }

            String key = day + "-" + period + "-" + lesson.classId;
            cardsByTimeAndClass.computeIfAbsent(key, k -> new ArrayList<>()).add(lessonId);
        }

        // Merge overlapping lessons
        for (List<String> group : cardsByTimeAndClass.values()) {
            if (group.size() > 1) {
                String baseId = group.get(0);
                ParsedLesson baseLesson = null;
                for (ParsedLesson pl : rawLessons) {
                    if (pl.id.equals(baseId)) {
                        baseLesson = pl;
                        break;
                    }
                }
                if (baseLesson == null) {
                    continue;
                }

                for (int i = 1; i < group.size(); i++) {
                    String otherId = group.get(i);
                    if (otherId.equals(baseId)) {
                        continue;
                    }

                    ParsedLesson otherLesson = null;
                    int otherIdx = -1;
                    for (int j = 0; j < rawLessons.size(); j++) {
                        if (rawLessons.get(j).id.equals(otherId)) {
                            otherLesson = rawLessons.get(j);
                            otherIdx = j;
                            break;
                        }
                    }

                    if (otherLesson != null) {
                        // Merge teachers
                        for (TeacherAssignment ta : otherLesson.teachers) {
                            boolean exists = false;
                            for (TeacherAssignment bta : baseLesson.teachers) {
                                if (bta.teacher().id().equals(ta.teacher().id())) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                baseLesson.teachers.add(new TeacherAssignment(ta.teacher(), "assistant"));
                            }
                        }
                        rawLessons.remove(otherIdx);
                    }
                }
            }
        }

        // Build Final Entities
        List<Lesson> lessonsList = new ArrayList<>();
        List<LessonAssignment> assignmentsList = new ArrayList<>();

        for (ParsedLesson pl : rawLessons) {
            Subject subject = subjectMap.get(pl.subjectId);
            Clazz clazz = classMap.get(pl.classId);
            Classroom classroom = classroomMap.get(pl.classroomId);

            Lesson lesson = new Lesson(pl.id, subject, clazz, classroom, pl.teachers, pl.periods);
            lessonsList.add(lesson);

            // Generate LessonAssignments for solver
            for (int i = 0; i < lesson.periods(); i++) {
                String assignmentId = "card-" + lesson.id() + "-" + i;
                assignmentsList.add(new LessonAssignment(assignmentId, lesson, false));
            }
        }

        List<Teacher> teachers = new ArrayList<>(teacherMap.values());
        List<Clazz> classes = new ArrayList<>(classMap.values());
        List<Subject> subjects = new ArrayList<>(subjectMap.values());
        List<Classroom> classrooms = new ArrayList<>(classroomMap.values());

        // Default Days (Mon-Fri)
        List<Day> days = List.of(
            new Day("Mon"), new Day("Tue"), new Day("Wed"), new Day("Thu"), new Day("Fri")
        );
        // Default Periods (1-5)
        List<Period> periods = List.of(
            new Period(1), new Period(2), new Period(3), new Period(4), new Period(5)
        );

        return new TimetableSolution(
            teachers, classes, subjects, classrooms, days, periods,
            new ArrayList<>(), new ArrayList<>(), assignmentsList
        );
    }
}
