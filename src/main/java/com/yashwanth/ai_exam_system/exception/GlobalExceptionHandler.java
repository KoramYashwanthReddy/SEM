package com.yashwanth.ai_exam_system.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ErrorResponse> handleBaseException(
            BaseException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = resolveStatus(ex);

        ErrorResponse error = buildError(
                ex.getErrorCode(),
                ex.getMessage(),
                ex.getErrorCause(),
                status,
                null,
                request
        );

        return new ResponseEntity<>(error, status);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {

        String message = "Validation failed";

        if (ex.getBindingResult().getFieldError() != null) {
            message = ex.getBindingResult()
                    .getFieldError()
                    .getDefaultMessage();
        }

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fieldError -> fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage()));

        ErrorResponse error = buildError(
                "VALIDATION_ERROR",
                message,
                "Invalid request payload",
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "ACCESS_DENIED",
                "You do not have permission",
                ex.getMessage(),
                HttpStatus.FORBIDDEN,
                null,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "ILLEGAL_ARGUMENT",
                ex.getMessage(),
                "Invalid method argument",
                HttpStatus.BAD_REQUEST,
                null,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {

        String requiredType = ex.getRequiredType() != null
                ? ex.getRequiredType().getSimpleName()
                : "value";

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        fieldErrors.put(ex.getName(), "Expected " + requiredType + " but received '" + ex.getValue() + "'");

        ErrorResponse error = buildError(
                "INVALID_PARAMETER",
                "Invalid " + ex.getName(),
                "Expected " + requiredType + " but received '" + ex.getValue() + "'",
                HttpStatus.BAD_REQUEST,
                fieldErrors,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableMessage(
            HttpMessageNotReadableException ex,
            HttpServletRequest request
    ) {
        ErrorResponse error = buildError(
                "INVALID_REQUEST_BODY",
                "Request body format is invalid",
                ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage(),
                HttpStatus.BAD_REQUEST,
                null,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest request
    ) {
        ErrorResponse error = buildError(
                "RUNTIME_ERROR",
                ex.getMessage() == null || ex.getMessage().isBlank()
                        ? "Request failed"
                        : ex.getMessage(),
                "Runtime exception",
                HttpStatus.BAD_REQUEST,
                null,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "INTERNAL_SERVER_ERROR",
                "Something went wrong",
                ex.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR,
                null,
                request
        );

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ErrorResponse buildError(
            String code,
            String message,
            String cause,
            HttpStatus status,
            Map<String, String> fieldErrors,
            HttpServletRequest request
    ) {

        ErrorResponse error = new ErrorResponse();
        error.setErrorCode(code);
        error.setMessage(message);
        error.setCause(cause);
        error.setStatus(status.value());
        error.setErrorId(UUID.randomUUID().toString());
        error.setFieldErrors(fieldErrors);
        error.setTimestamp(LocalDateTime.now());
        error.setPath(request.getRequestURI());

        return error;
    }

    private HttpStatus resolveStatus(BaseException ex) {
        if (ex instanceof UnauthorizedException) {
            return HttpStatus.UNAUTHORIZED;
        }
        if (ex instanceof ForbiddenException) {
            return HttpStatus.FORBIDDEN;
        }
        if (ex instanceof ResourceNotFoundException) {
            return HttpStatus.NOT_FOUND;
        }
        if (ex instanceof ConflictException) {
            return HttpStatus.CONFLICT;
        }
        if (ex instanceof ValidationException) {
            return HttpStatus.BAD_REQUEST;
        }
        return HttpStatus.BAD_REQUEST;
    }
}
