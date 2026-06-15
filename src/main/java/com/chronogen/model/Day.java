package com.chronogen.model;

public record Day(String name) {
    @Override
    public String toString() {
        return name;
    }
}
