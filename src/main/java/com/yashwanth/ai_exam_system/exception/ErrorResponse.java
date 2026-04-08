package com.yashwanth.ai_exam_system.exception;

import java.time.LocalDateTime;
import java.util.Map;

public class ErrorResponse {

    private String errorCode;
    private String message;
    private String cause;
    private Integer status;
    private String errorId;
    private Map<String, String> fieldErrors;
    private LocalDateTime timestamp;
    private String path;

    public ErrorResponse() {
    }

    public ErrorResponse(String errorCode, String message, String cause,
                         Integer status, String errorId, Map<String, String> fieldErrors,
                         LocalDateTime timestamp, String path) {
        this.errorCode = errorCode;
        this.message = message;
        this.cause = cause;
        this.status = status;
        this.errorId = errorId;
        this.fieldErrors = fieldErrors;
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

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getErrorId() {
        return errorId;
    }

    public void setErrorId(String errorId) {
        this.errorId = errorId;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(Map<String, String> fieldErrors) {
        this.fieldErrors = fieldErrors;
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
