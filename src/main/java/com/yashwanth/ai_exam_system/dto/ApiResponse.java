package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ApiResponse<T> {

    private String status;
    private String message;
    private T data;
    private String errorCode;
    private String traceId;
    private LocalDateTime timestamp;

    // ================= CONSTRUCTORS =================

    public ApiResponse() {}

    public ApiResponse(String status, String message, T data,
                       String errorCode, String traceId, LocalDateTime timestamp) {
        this.status = status;
        this.message = message;
        this.data = data;
        this.errorCode = errorCode;
        this.traceId = traceId;
        this.timestamp = timestamp;
    }

    // ================= GETTERS / SETTERS =================

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    // ================= STATIC FACTORY METHODS =================

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(
                "SUCCESS",
                message,
                data,
                null,
                generateTraceId(),
                LocalDateTime.now()
        );
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return new ApiResponse<>(
                "ERROR",
                message,
                null,
                errorCode,
                generateTraceId(),
                LocalDateTime.now()
        );
    }

    // ================= BUILDER (MANUAL - NO LOMBOK NEEDED) =================

    public static <T> Builder<T> builder() {
        return new Builder<>();
    }

    public static class Builder<T> {
        private String status;
        private String message;
        private T data;
        private String errorCode;
        private String traceId;
        private LocalDateTime timestamp;

        public Builder<T> status(String status) {
            this.status = status;
            return this;
        }

        public Builder<T> message(String message) {
            this.message = message;
            return this;
        }

        public Builder<T> data(T data) {
            this.data = data;
            return this;
        }

        public Builder<T> errorCode(String errorCode) {
            this.errorCode = errorCode;
            return this;
        }

        public Builder<T> traceId(String traceId) {
            this.traceId = traceId;
            return this;
        }

        public Builder<T> timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public ApiResponse<T> build() {
            return new ApiResponse<>(
                    status,
                    message,
                    data,
                    errorCode,
                    traceId != null ? traceId : generateTraceId(),
                    timestamp != null ? timestamp : LocalDateTime.now()
            );
        }
    }

    private static String generateTraceId() {
        return UUID.randomUUID().toString();
    }
}