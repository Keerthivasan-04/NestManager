package com.nestmanager.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * DuplicateResourceException
 *
 * Thrown when a create/update would produce a duplicate entry.
 * Automatically maps to HTTP 409 Conflict.
 *
 * Used by:
 *  - RoomService    → duplicate room number on create/update
 *  - BookingService → conflicting booking on same room + date
 *
 * Example response:
 * {
 *   "status": 409,
 *   "error": "Conflict",
 *   "message": "Room number '101' already exists"
 * }
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
