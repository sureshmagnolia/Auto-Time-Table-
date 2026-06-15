package com.chronogen.model;

public record Period(int number) {
    @Override
    public String toString() {
        return "P" + number;
    }
}
