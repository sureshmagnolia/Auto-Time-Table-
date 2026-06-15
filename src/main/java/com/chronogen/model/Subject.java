package com.chronogen.model;

public record Subject(String id, String name, String shortName) {
    @Override
    public String toString() {
        return name;
    }
}
