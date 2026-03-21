package com.yashwanth.ai_exam_system.exception;

public class UnauthorizedException extends BaseException {

    public UnauthorizedException(String message) {
        super("UNAUTHORIZED", message, "User not authenticated");
    }
}