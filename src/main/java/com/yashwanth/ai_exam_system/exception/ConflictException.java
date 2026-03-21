package com.yashwanth.ai_exam_system.exception;

public class ConflictException extends BaseException {

    public ConflictException(String message) {
        super("CONFLICT", message, "Duplicate or conflicting data");
    }
}