package com.nestmanager.dto;

import com.nestmanager.model.Booking;
import com.nestmanager.model.Booking.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * BookingDTO — request and response shapes for Booking
 *
 * Contains two static nested classes:
 *  - Request  → what the frontend sends (POST / PUT)
 *  - Response → what the backend returns (GET)
 */
public class BookingDTO {

    // ----------------------------------------------------------------
    // BOOKING REQUEST
    // Sent by bookings.js when creating or editing a booking
    //
    // {
    //   "guestName": "Ravi Shankar",
    //   "guestPhone": "+91 91234 56789",
    //   "guestEmail": "ravi@email.com",
    //   "guestsCount": 1,
    //   "roomNumber": "104",
    //   "bookingType": "MONTHLY",
    //   "checkInDate": "2025-03-20",
    //   "checkOutDate": "2025-04-20",
    //   "amount": 5500,
    //   "advancePaid": 2000,
    //   "status": "CONFIRMED",
    //   "paymentStatus": "PARTIAL",
    //   "notes": "Ground floor preferred."
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {

        @NotBlank(message = "Guest name is required")
        @Size(max = 100, message = "Guest name must not exceed 100 characters")
        private String guestName;

        @NotBlank(message = "Phone is required")
        @Size(max = 20)
        private String guestPhone;

        @Email(message = "Enter a valid email address")
        @Size(max = 100)
        private String guestEmail;

        @Min(value = 1, message = "Guests count must be at least 1")
        @Max(value = 10, message = "Guests count cannot exceed 10")
        private Integer guestsCount = 1;

        @NotBlank(message = "Room is required")
        private String roomNumber;

        private BookingType bookingType = BookingType.MONTHLY;

        @NotNull(message = "Check-in date is required")
        private LocalDate checkInDate;

        private LocalDate checkOutDate;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
        private BigDecimal amount;

        private BigDecimal advancePaid = BigDecimal.ZERO;

        private BookingStatus status = BookingStatus.CONFIRMED;

        private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

        private String notes;
    }

    // ----------------------------------------------------------------
    // BOOKING RESPONSE
    // Returned by BookingController for GET requests
    //
    // {
    //   "id": 1,
    //   "bookingCode": "BK-001",
    //   "guestName": "Ravi Shankar",
    //   "guestPhone": "+91 91234 56789",
    //   "guestEmail": "ravi@email.com",
    //   "guestsCount": 1,
    //   "roomNumber": "104",
    //   "bookingType": "MONTHLY",
    //   "checkInDate": "2025-03-20",
    //   "checkOutDate": "2025-04-20",
    //   "amount": 5500.00,
    //   "advancePaid": 2000.00,
    //   "status": "CONFIRMED",
    //   "paymentStatus": "PARTIAL",
    //   "notes": "Ground floor preferred.",
    //   "createdAt": "2025-03-01T10:30:00"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {

        private Long id;
        private String bookingCode;
        private String guestName;
        private String guestPhone;
        private String guestEmail;
        private Integer guestsCount;
        private String roomNumber;        // denormalized from room.roomNumber
        private BookingType bookingType;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private BigDecimal amount;
        private BigDecimal advancePaid;
        private BookingStatus status;
        private PaymentStatus paymentStatus;
        private String notes;
        private LocalDateTime createdAt;

        // Convenience factory — builds response from Booking entity
        public static Response from(Booking booking) {
            return Response.builder()
                    .id(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .guestName(booking.getGuestName())
                    .guestPhone(booking.getGuestPhone())
                    .guestEmail(booking.getGuestEmail())
                    .guestsCount(booking.getGuestsCount())
                    .roomNumber(booking.getRoomNumber())   // uses helper method
                    .bookingType(booking.getBookingType())
                    .checkInDate(booking.getCheckInDate())
                    .checkOutDate(booking.getCheckOutDate())
                    .amount(booking.getAmount())
                    .advancePaid(booking.getAdvancePaid())
                    .status(booking.getStatus())
                    .paymentStatus(booking.getPaymentStatus())
                    .notes(booking.getNotes())
                    .createdAt(booking.getCreatedAt())
                    .build();
        }
    }
}
