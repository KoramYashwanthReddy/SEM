package com.yashwanth.ai_exam_system.exception;

public class ValidationException extends BaseException {

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message, "Validation failed");
    }
}