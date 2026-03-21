package com.yashwanth.ai_exam_system.exception;

public class BaseException extends RuntimeException {

    private final String errorCode;
    private final String errorCause;

    public BaseException(String errorCode, String message, String errorCause) {
        super(message);
        this.errorCode = errorCode;
        this.errorCause = errorCause;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorCause() {
        return errorCause;
    }
}