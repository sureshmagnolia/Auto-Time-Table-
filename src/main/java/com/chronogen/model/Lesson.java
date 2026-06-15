package com.chronogen.model;

import java.util.List;

public record Lesson(
    String id,
    Subject subject,
    Clazz clazz,
    Classroom defaultClassroom,
    List<TeacherAssignment> teachers,
    int periods
) {
}
