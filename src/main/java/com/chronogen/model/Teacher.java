package com.chronogen.model;

public record Teacher(String id, String name, String shortName) {
    @Override
    public String toString() {
        return name;
    }
}
