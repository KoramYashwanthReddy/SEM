package com.yashwanth.ai_exam_system.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Custom Exception
    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ErrorResponse> handleBaseException(
            BaseException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                ex.getErrorCode(),
                ex.getMessage(),
                ex.getErrorCause(),   // ✅ fixed here
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Validation Exception
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

        ErrorResponse error = buildError(
                "VALIDATION_ERROR",
                message,
                "Invalid request payload",
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Access Denied
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "ACCESS_DENIED",
                "You do not have permission",
                ex.getMessage(),
                request
        );

        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    // Illegal Argument
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "ILLEGAL_ARGUMENT",
                ex.getMessage(),
                "Invalid method argument",
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Type Mismatch
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {

        String requiredType = ex.getRequiredType() != null
                ? ex.getRequiredType().getSimpleName()
                : "value";

        ErrorResponse error = buildError(
                "INVALID_PARAMETER",
                "Invalid " + ex.getName(),
                "Expected " + requiredType + " but received '" + ex.getValue() + "'",
                request
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Null Pointer
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ErrorResponse> handleNullPointer(
            NullPointerException ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "NULL_POINTER",
                "Unexpected null value",
                ex.getMessage(),
                request
        );

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Generic Exception
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request
    ) {

        ErrorResponse error = buildError(
                "INTERNAL_SERVER_ERROR",
                "Something went wrong",
                ex.getMessage(),
                request
        );

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Common Builder Method
    private ErrorResponse buildError(
            String code,
            String message,
            String cause,
            HttpServletRequest request
    ) {

        ErrorResponse error = new ErrorResponse();
        error.setErrorCode(code);
        error.setMessage(message);
        error.setCause(cause);
        error.setTimestamp(LocalDateTime.now());
        error.setPath(request.getRequestURI());

        return error;
    }
}
