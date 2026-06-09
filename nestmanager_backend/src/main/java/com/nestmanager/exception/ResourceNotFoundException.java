package com.nestmanager.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * ResourceNotFoundException
 *
 * Thrown when a requested entity is not found in the database.
 * Automatically maps to HTTP 404 Not Found.
 *
 * Used by:
 *  - RoomService    → findRoomById(), findRoomByNumber()
 *  - TenantService  → findTenantById()
 *  - BookingService → findBookingById()
 *  - PaymentService → findPaymentById()
 *  - NotificationService → findById()
 *
 * Example response:
 * {
 *   "status": 404,
 *   "error": "Not Found",
 *   "message": "Room not found with id: 99"
 * }
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
