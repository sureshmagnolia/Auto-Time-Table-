package com.chronogen.model;

import ai.timefold.solver.core.api.domain.entity.PlanningEntity;
import ai.timefold.solver.core.api.domain.lookup.PlanningId;
import ai.timefold.solver.core.api.domain.variable.PlanningVariable;
import ai.timefold.solver.core.api.domain.entity.PlanningPin;

@PlanningEntity
public class LessonAssignment {

    @PlanningId
    private String id;

    private Lesson lesson;

    @PlanningPin
    private boolean locked;

    @PlanningVariable(valueRangeProviderRefs = "dayRange")
    private Day day;

    @PlanningVariable(valueRangeProviderRefs = "periodRange")
    private Period period;

    @PlanningVariable(valueRangeProviderRefs = "classroomRange")
    private Classroom classroom;

    // Timefold needs a default constructor
    public LessonAssignment() {
    }

    public LessonAssignment(String id, Lesson lesson, boolean locked) {
        this.id = id;
        this.lesson = lesson;
        this.locked = locked;
    }

    public LessonAssignment(String id, Lesson lesson, Day day, Period period, Classroom classroom, boolean locked) {
        this.id = id;
        this.lesson = lesson;
        this.day = day;
        this.period = period;
        this.classroom = classroom;
        this.locked = locked;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Lesson getLesson() {
        return lesson;
    }

    public void setLesson(Lesson lesson) {
        this.lesson = lesson;
    }

    public boolean isLocked() {
        return locked;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }

    public Day getDay() {
        return day;
    }

    public void setDay(Day day) {
        this.day = day;
    }

    public Period getPeriod() {
        return period;
    }

    public void setPeriod(Period period) {
        this.period = period;
    }

    public Classroom getClassroom() {
        return classroom;
    }

    public void setClassroom(Classroom classroom) {
        this.classroom = classroom;
    }

    @Override
    public String toString() {
        return "LessonAssignment{" +
                "id='" + id + '\'' +
                ", lesson=" + (lesson != null ? lesson.id() : null) +
                ", day=" + day +
                ", period=" + period +
                ", classroom=" + classroom +
                ", locked=" + locked +
                '}';
    }
}
