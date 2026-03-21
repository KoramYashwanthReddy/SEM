package com.yashwanth.ai_exam_system.exception;

public class ForbiddenException extends BaseException {

    public ForbiddenException(String message) {
        super("FORBIDDEN", message, "User not allowed to access this resource");
    }
}