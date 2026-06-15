package com.chronogen.solver;

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors;
import com.chronogen.model.*;

public class TimetableConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory factory) {
        return new Constraint[] {
            // Hard Constraints
            teacherConflict(factory),
            classConflict(factory),
            classroomConflict(factory),
            timeOffConflict(factory),
            
            // Soft Constraints
            teacherPreferencesAvoid(factory),
            teacherPreferencesPrefer(factory)
        };
    }

    // A teacher cannot be scheduled to teach multiple lessons at the same time
    private Constraint teacherConflict(ConstraintFactory factory) {
        return factory.forEachUniquePair(LessonAssignment.class,
                Joiners.equal(LessonAssignment::getDay),
                Joiners.equal(LessonAssignment::getPeriod))
                .filter((a, b) -> shareTeacher(a.getLesson(), b.getLesson()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Teacher conflict");
    }

    // A class/grade cannot have multiple lessons scheduled at the same time
    private Constraint classConflict(ConstraintFactory factory) {
        return factory.forEachUniquePair(LessonAssignment.class,
                Joiners.equal(LessonAssignment::getDay),
                Joiners.equal(LessonAssignment::getPeriod),
                Joiners.equal(a -> a.getLesson().clazz()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Class conflict");
    }

    // A classroom cannot be double-booked by different lessons
    private Constraint classroomConflict(ConstraintFactory factory) {
        return factory.forEachUniquePair(LessonAssignment.class,
                Joiners.equal(LessonAssignment::getDay),
                Joiners.equal(LessonAssignment::getPeriod),
                Joiners.equal(LessonAssignment::getClassroom))
                .filter((a, b) -> a.getClassroom() != null)
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Classroom conflict");
    }

    // Prevent scheduling lessons in slots marked as Time-Off (unavailability blocks)
    private Constraint timeOffConflict(ConstraintFactory factory) {
        return factory.forEach(LessonAssignment.class)
                .join(TimeOff.class,
                        Joiners.equal(LessonAssignment::getDay, TimeOff::day),
                        Joiners.equal(LessonAssignment::getPeriod, TimeOff::period))
                .filter((assignment, timeOff) -> {
                    // Match if time-off is for the class
                    if (assignment.getLesson().clazz().id().equals(timeOff.entityId())) {
                        return true;
                    }
                    // Match if time-off is for any assigned teacher
                    for (TeacherAssignment ta : assignment.getLesson().teachers()) {
                        if (ta.teacher().id().equals(timeOff.entityId())) {
                            return true;
                        }
                    }
                    return false;
                })
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Time-off conflict");
    }

    // Penalize when scheduling a teacher in a slot they prefer to "avoid"
    private Constraint teacherPreferencesAvoid(ConstraintFactory factory) {
        return factory.forEach(LessonAssignment.class)
                .join(Preference.class,
                        Joiners.equal(LessonAssignment::getDay, Preference::day),
                        Joiners.equal(LessonAssignment::getPeriod, Preference::period))
                .filter((assignment, pref) -> {
                    if (!pref.type().equalsIgnoreCase("avoid")) {
                        return false;
                    }
                    for (TeacherAssignment ta : assignment.getLesson().teachers()) {
                        if (ta.teacher().id().equals(pref.teacherId())) {
                            return true;
                        }
                    }
                    return false;
                })
                .penalize(HardSoftScore.ONE_SOFT, 10)
                .asConstraint("Teacher preference - avoid");
    }

    // Reward when scheduling a teacher in a slot they "prefer"
    private Constraint teacherPreferencesPrefer(ConstraintFactory factory) {
        return factory.forEach(LessonAssignment.class)
                .join(Preference.class,
                        Joiners.equal(LessonAssignment::getDay, Preference::day),
                        Joiners.equal(LessonAssignment::getPeriod, Preference::period))
                .filter((assignment, pref) -> {
                    if (!pref.type().equalsIgnoreCase("prefer")) {
                        return false;
                    }
                    for (TeacherAssignment ta : assignment.getLesson().teachers()) {
                        if (ta.teacher().id().equals(pref.teacherId())) {
                            return true;
                        }
                    }
                    return false;
                })
                .reward(HardSoftScore.ONE_SOFT, 10)
                .asConstraint("Teacher preference - prefer");
    }

    // Helper method to determine if two lessons share any teachers
    private boolean shareTeacher(Lesson a, Lesson b) {
        if (a == null || b == null || a.teachers() == null || b.teachers() == null) {
            return false;
        }
        for (TeacherAssignment taA : a.teachers()) {
            for (TeacherAssignment taB : b.teachers()) {
                if (taA.teacher().id().equals(taB.teacher().id())) {
                    return true;
                }
            }
        }
        return false;
    }
}
