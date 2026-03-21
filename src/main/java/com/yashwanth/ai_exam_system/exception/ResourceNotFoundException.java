package com.yashwanth.ai_exam_system.exception;

public class ResourceNotFoundException extends BaseException {

    public ResourceNotFoundException(String message) {
        super("NOT_FOUND", message, "Requested resource not found in database");
    }
}