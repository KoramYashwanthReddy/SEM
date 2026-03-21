package com.yashwanth.ai_exam_system.exception;

import java.time.LocalDateTime;

public class ErrorResponse {

    private String errorCode;
    private String message;
    private String cause;
    private LocalDateTime timestamp;
    private String path;

    public ErrorResponse() {
    }

    public ErrorResponse(String errorCode, String message, String cause,
                         LocalDateTime timestamp, String path) {
        this.errorCode = errorCode;
        this.message = message;
        this.cause = cause;
        this.timestamp = timestamp;
        this.path = path;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getCause() {
        return cause;
    }

    public void setCause(String cause) {
        this.cause = cause;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}