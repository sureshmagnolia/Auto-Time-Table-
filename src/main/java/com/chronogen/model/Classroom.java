package com.chronogen.model;

public record Classroom(String id, String name, String shortName, String capacity) {
    @Override
    public String toString() {
        return name;
    }
}
