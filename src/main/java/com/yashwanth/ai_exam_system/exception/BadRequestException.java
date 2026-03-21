package com.yashwanth.ai_exam_system.exception;

public class BadRequestException extends BaseException {

    public BadRequestException(String message) {
        super("BAD_REQUEST", message, "Invalid request data");
    }
}