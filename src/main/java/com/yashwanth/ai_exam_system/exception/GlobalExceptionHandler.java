package com.yashwanth.ai_exam_system.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.yashwanth.ai_exam_system.dto.ApiResponse;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ================= STATIC RESOURCE FIX =================

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Object> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        if (request.getRequestURI().endsWith(".ico")) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", "Resource not found"));
    }

    // ================= BASE EXCEPTION =================

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ApiResponse<Object>> handleBaseException(
            BaseException ex,
            HttpServletRequest request) {

        HttpStatus status = resolveStatus(ex);

        log.error("[BASE_EXCEPTION] code={}, message={}, path={}",
                safe(ex.getErrorCode()),
                safe(ex.getMessage()),
                safePath(request),
                ex);

        return buildErrorResponse(
                ex.getErrorCode(),
                ex.getMessage(),
                ex.getErrorCause(),
                status,
                null,
                request);
    }

    // ================= VALIDATION =================

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        String message = "Validation failed";

        if (ex.getBindingResult().getFieldError() != null) {
            message = ex.getBindingResult()
                    .getFieldError()
                    .getDefaultMessage();
        }

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fieldError -> fieldErrors.put(
                        fieldError.getField(),
                        fieldError.getDefaultMessage()));

        log.warn("[VALIDATION_ERROR] path={}, errors={}",
                safePath(request),
                fieldErrors);

        return buildErrorResponse(
                "VALIDATION_ERROR",
                message,
                "Invalid request payload",
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request);
    }

    // ================= SECURITY =================

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request) {

        log.warn("[ACCESS_DENIED] path={}, message={}",
                safePath(request),
                safe(ex.getMessage()));

        return buildErrorResponse(
                "ACCESS_DENIED",
                "You do not have permission",
                ex.getMessage(),
                HttpStatus.FORBIDDEN,
                null,
                request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(
            BadCredentialsException ex,
            HttpServletRequest request) {

        log.warn("[AUTH_FAILED] path={}, message={}",
                safePath(request),
                safe(ex.getMessage()));

        return buildErrorResponse(
                "UNAUTHORIZED",
                "Invalid credentials",
                ex.getMessage(),
                HttpStatus.UNAUTHORIZED,
                null,
                request);
    }

    // ================= ARGUMENT ISSUES =================

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request) {

        log.warn("[ILLEGAL_ARGUMENT] path={}, message={}",
                safePath(request),
                safe(ex.getMessage()));

        return buildErrorResponse(
                "ILLEGAL_ARGUMENT",
                ex.getMessage(),
                "Invalid method argument",
                HttpStatus.BAD_REQUEST,
                null,
                request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request) {

        String requiredType = ex.getRequiredType() != null
                ? ex.getRequiredType().getSimpleName()
                : "value";

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        fieldErrors.put(
                ex.getName(),
                "Expected " + requiredType + " but received '" + ex.getValue() + "'");

        log.warn("[TYPE_MISMATCH] path={}, field={}, value={}",
                safePath(request),
                ex.getName(),
                ex.getValue());

        return buildErrorResponse(
                "INVALID_PARAMETER",
                "Invalid " + ex.getName(),
                "Expected " + requiredType + " but received '" + ex.getValue() + "'",
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request);
    }

    // ================= REQUEST BODY =================

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnreadableMessage(
            HttpMessageNotReadableException ex,
            HttpServletRequest request) {

        log.warn("[INVALID_BODY] path={}, error={}",
                safePath(request),
                safe(ex.getMessage()));

        return buildErrorResponse(
                "INVALID_REQUEST_BODY",
                "Request body format is invalid",
                ex.getMostSpecificCause() != null
                        ? ex.getMostSpecificCause().getMessage()
                        : ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                null,
                request);
    }

    // ================= CONSTRAINT =================

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getConstraintViolations()
                .forEach(violation -> fieldErrors.put(
                        violation.getPropertyPath().toString(),
                        violation.getMessage()));

        log.warn("[CONSTRAINT_VIOLATION] path={}, errors={}",
                safePath(request),
                fieldErrors);

        return buildErrorResponse(
                "VALIDATION_ERROR",
                "Validation failed",
                "Invalid request parameter",
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request);
    }

    // ================= MISSING PARAM =================

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> handleMissingParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest request) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        fieldErrors.put(ex.getParameterName(), "Parameter is required");

        log.warn("[MISSING_PARAM] path={}, param={}",
                safePath(request),
                ex.getParameterName());

        return buildErrorResponse(
                "MISSING_PARAMETER",
                "Required request parameter is missing",
                ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request);
    }

    // ================= METHOD =================

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request) {

        log.warn("[METHOD_NOT_ALLOWED] path={}, method={}",
                safePath(request),
                ex.getMethod());

        return buildErrorResponse(
                "METHOD_NOT_ALLOWED",
                "HTTP method is not supported for this endpoint",
                ex.getMessage(),
                HttpStatus.METHOD_NOT_ALLOWED,
                null,
                request);
    }

    // ================= RUNTIME =================

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest request) {

        log.error("[RUNTIME_EXCEPTION] path={}, message={}",
                safePath(request),
                safe(ex.getMessage()),
                ex);

        if (request.getRequestURI().endsWith(".ico")) {
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return (ResponseEntity) buildErrorResponse(
                "RUNTIME_ERROR",
                (ex.getMessage() == null || ex.getMessage().isBlank())
                        ? "Request failed"
                        : ex.getMessage(),
                "Runtime exception",
                HttpStatus.BAD_REQUEST,
                null,
                request);
    }

    // ================= GENERIC =================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGenericException(
            Exception ex,
            HttpServletRequest request) {

        log.error("[INTERNAL_ERROR] path={}, message={}",
                safePath(request),
                safe(ex.getMessage()),
                ex);

        if (request.getRequestURI().endsWith(".ico")) {
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return (ResponseEntity) buildErrorResponse(
                "INTERNAL_SERVER_ERROR",
                "Something went wrong",
                ex.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR,
                null,
                request);
    }

    // ================= CORE BUILDER =================

    private ResponseEntity<ApiResponse<Object>> buildErrorResponse(
            String code,
            String message,
            String cause,
            HttpStatus status,
            Map<String, String> fieldErrors,
            HttpServletRequest request) {

        String traceId = UUID.randomUUID().toString();

        ErrorResponse errorDetails = new ErrorResponse();
        errorDetails.setErrorCode(code);
        errorDetails.setMessage(message);
        errorDetails.setCause(cause);
        errorDetails.setStatus(status.value());
        errorDetails.setErrorId(traceId);
        errorDetails.setFieldErrors(fieldErrors);
        errorDetails.setTimestamp(LocalDateTime.now());
        errorDetails.setPath(safePath(request));

        ApiResponse<Object> response = ApiResponse.builder()
                .status("ERROR")
                .message(message)
                .data(errorDetails)
                .timestamp(LocalDateTime.now())
                .traceId(traceId)
                .errorCode(code)
                .build();

        return new ResponseEntity<>(response, status);
    }

    // ================= STATUS RESOLVER =================

    private HttpStatus resolveStatus(BaseException ex) {
        if (ex instanceof UnauthorizedException) return HttpStatus.UNAUTHORIZED;
        if (ex instanceof ForbiddenException) return HttpStatus.FORBIDDEN;
        if (ex instanceof ResourceNotFoundException) return HttpStatus.NOT_FOUND;
        if (ex instanceof ConflictException) return HttpStatus.CONFLICT;
        if (ex instanceof ValidationException) return HttpStatus.BAD_REQUEST;
        return HttpStatus.BAD_REQUEST;
    }

    // ================= SAFE HELPERS =================

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "N/A" : value;
    }

    private String safePath(HttpServletRequest request) {
        return request != null ? request.getRequestURI() : "UNKNOWN";
    }
}