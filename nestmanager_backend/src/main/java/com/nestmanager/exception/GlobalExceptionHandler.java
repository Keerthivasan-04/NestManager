package com.nestmanager.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * GlobalExceptionHandler
 *
 * Catches all exceptions thrown across the entire application and
 * returns a consistent JSON error response to the frontend.
 *
 * Without this, Spring Boot returns an HTML error page or an
 * inconsistent JSON format — the frontend can't parse it reliably.
 *
 * All responses follow this shape:
 * {
 *   "status"    : 404,
 *   "error"     : "Not Found",
 *   "message"   : "Room not found with id: 99",
 *   "timestamp" : "2025-03-20T10:30:00"
 * }
 *
 * For validation errors (@Valid failures), an additional "errors" map
 * is included with field-level messages:
 * {
 *   "status"  : 400,
 *   "error"   : "Validation Failed",
 *   "message" : "Input validation failed",
 *   "errors"  : {
 *     "roomNumber"    : "Room number is required",
 *     "pricePerMonth" : "Price must be greater than 0"
 *   }
 * }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ----------------------------------------------------------------
    // 404 — Resource Not Found
    // Thrown by findById() methods in services
    // ----------------------------------------------------------------
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            ResourceNotFoundException ex) {

        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    // ----------------------------------------------------------------
    // 409 — Duplicate Resource
    // Thrown on duplicate room number or conflicting booking
    // ----------------------------------------------------------------
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicate(
            DuplicateResourceException ex) {

        return buildResponse(HttpStatus.CONFLICT, "Conflict", ex.getMessage());
    }

    // ----------------------------------------------------------------
    // 400 — Validation Failed
    // Thrown when @Valid fails on a request body
    // Returns field-level error messages
    // ----------------------------------------------------------------
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {

        // Collect all field errors into a map
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("status",    HttpStatus.BAD_REQUEST.value());
        body.put("error",     "Validation Failed");
        body.put("message",   "Input validation failed");
        body.put("errors",    fieldErrors);
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // ----------------------------------------------------------------
    // 400 — Illegal State
    // Thrown when a business rule is violated
    // e.g. cannot delete occupied room, tenant already checked out,
    //      invalid booking status transition
    // ----------------------------------------------------------------
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException ex) {

        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    // ----------------------------------------------------------------
    // 400 — Illegal Argument
    // Thrown when a method receives an inappropriate argument
    // ----------------------------------------------------------------
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex) {

        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    // ----------------------------------------------------------------
    // 401 — Bad Credentials
    // Thrown by AuthService when username/password is wrong
    // ----------------------------------------------------------------
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(
            BadCredentialsException ex) {

        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                "Invalid username or password"
        );
    }

    // ----------------------------------------------------------------
    // 403 — Access Denied
    // Thrown when a user tries to access a resource they don't have
    // permission for (role-based access with @PreAuthorize)
    // ----------------------------------------------------------------
    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AuthorizationDeniedException ex) {

        return buildResponse(
                HttpStatus.FORBIDDEN,
                "Forbidden",
                "You do not have permission to perform this action"
        );
    }

    // ----------------------------------------------------------------
    // 500 — All other unhandled exceptions
    // Catches anything not specifically handled above
    // Returns a generic message — never expose internal details
    // ----------------------------------------------------------------
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {

        // Log the full stack trace for debugging
        System.err.println("[ERROR] Unhandled exception: " + ex.getMessage());
        ex.printStackTrace();

        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "Something went wrong. Please try again later."
        );
    }

    // ----------------------------------------------------------------
    // HELPER — builds the standard error response body
    // ----------------------------------------------------------------
    private ResponseEntity<Map<String, Object>> buildResponse(
            HttpStatus status, String error, String message) {

        Map<String, Object> body = new HashMap<>();
        body.put("status",    status.value());
        body.put("error",     error);
        body.put("message",   message);
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(status).body(body);
    }
}
