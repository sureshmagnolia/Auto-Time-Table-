package com.chronogen.model;

import java.util.List;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;

@PlanningSolution
public class TimetableSolution {

    @ProblemFactCollectionProperty
    private List<Teacher> teachers;

    @ProblemFactCollectionProperty
    private List<Clazz> classes;

    @ProblemFactCollectionProperty
    private List<Subject> subjects;

    @ValueRangeProvider(id = "classroomRange")
    @ProblemFactCollectionProperty
    private List<Classroom> classrooms;

    @ValueRangeProvider(id = "dayRange")
    @ProblemFactCollectionProperty
    private List<Day> days;

    @ValueRangeProvider(id = "periodRange")
    @ProblemFactCollectionProperty
    private List<Period> periods;

    @ProblemFactCollectionProperty
    private List<TimeOff> timeOffs;

    @ProblemFactCollectionProperty
    private List<Preference> preferences;

    @PlanningEntityCollectionProperty
    private List<LessonAssignment> assignments;

    @PlanningScore
    private HardSoftScore score;

    // Timefold needs a default constructor
    public TimetableSolution() {
    }

    public TimetableSolution(List<Teacher> teachers, List<Clazz> classes, List<Subject> subjects,
                             List<Classroom> classrooms, List<Day> days, List<Period> periods,
                             List<TimeOff> timeOffs, List<Preference> preferences,
                             List<LessonAssignment> assignments) {
        this.teachers = teachers;
        this.classes = classes;
        this.subjects = subjects;
        this.classrooms = classrooms;
        this.days = days;
        this.periods = periods;
        this.timeOffs = timeOffs;
        this.preferences = preferences;
        this.assignments = assignments;
    }

    public List<Teacher> getTeachers() {
        return teachers;
    }

    public void setTeachers(List<Teacher> teachers) {
        this.teachers = teachers;
    }

    public List<Clazz> getClasses() {
        return classes;
    }

    public void setClasses(List<Clazz> classes) {
        this.classes = classes;
    }

    public List<Subject> getSubjects() {
        return subjects;
    }

    public void setSubjects(List<Subject> subjects) {
        this.subjects = subjects;
    }

    public List<Classroom> getClassrooms() {
        return classrooms;
    }

    public void setClassrooms(List<Classroom> classrooms) {
        this.classrooms = classrooms;
    }

    public List<Day> getDays() {
        return days;
    }

    public void setDays(List<Day> days) {
        this.days = days;
    }

    public List<Period> getPeriods() {
        return periods;
    }

    public void setPeriods(List<Period> periods) {
        this.periods = periods;
    }

    public List<TimeOff> getTimeOffs() {
        return timeOffs;
    }

    public void setTimeOffs(List<TimeOff> timeOffs) {
        this.timeOffs = timeOffs;
    }

    public List<Preference> getPreferences() {
        return preferences;
    }

    public void setPreferences(List<Preference> preferences) {
        this.preferences = preferences;
    }

    public List<LessonAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<LessonAssignment> assignments) {
        this.assignments = assignments;
    }

    public HardSoftScore getScore() {
        return score;
    }

    public void setScore(HardSoftScore score) {
        this.score = score;
    }

    @Override
    public String toString() {
        return "TimetableSolution{" +
                "assignmentsCount=" + (assignments != null ? assignments.size() : 0) +
                ", score=" + score +
                '}';
    }
}
