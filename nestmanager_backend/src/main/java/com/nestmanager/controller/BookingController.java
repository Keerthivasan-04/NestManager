package com.nestmanager.controller;

import com.nestmanager.dto.BookingDTO;
import com.nestmanager.model.Booking.BookingStatus;
import com.nestmanager.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * BookingController — REST endpoints for bookings
 *
 * Endpoints:
 *  GET    /api/bookings                    → all bookings (optional ?status=PENDING)
 *  GET    /api/bookings/{id}               → one booking
 *  POST   /api/bookings                    → create booking
 *  PUT    /api/bookings/{id}               → update booking
 *  PATCH  /api/bookings/{id}/confirm       → PENDING → CONFIRMED
 *  PATCH  /api/bookings/{id}/checkin       → CONFIRMED → CHECKED_IN
 *  PATCH  /api/bookings/{id}/checkout      → CHECKED_IN → CHECKED_OUT
 *  PATCH  /api/bookings/{id}/cancel        → any → CANCELLED
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // ----------------------------------------------------------------
    // GET /api/bookings
    // GET /api/bookings?status=PENDING
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<BookingDTO.Response>> getAllBookings(
            @RequestParam(required = false) BookingStatus status) {

        List<BookingDTO.Response> bookings = status != null
                ? bookingService.getBookingsByStatus(status)
                : bookingService.getAllBookings();

        return ResponseEntity.ok(bookings);
    }

    // ----------------------------------------------------------------
    // GET /api/bookings/{id}
    // ----------------------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<BookingDTO.Response> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }

    // ----------------------------------------------------------------
    // POST /api/bookings
    // ----------------------------------------------------------------
    @PostMapping
    public ResponseEntity<BookingDTO.Response> createBooking(
            @Valid @RequestBody BookingDTO.Request request) {

        BookingDTO.Response created = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ----------------------------------------------------------------
    // PUT /api/bookings/{id}
    // ----------------------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<BookingDTO.Response> updateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.Request request) {

        return ResponseEntity.ok(bookingService.updateBooking(id, request));
    }

    // ----------------------------------------------------------------
    // PATCH /api/bookings/{id}/confirm
    // PENDING → CONFIRMED
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<BookingDTO.Response> confirmBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.confirmBooking(id));
    }

    // ----------------------------------------------------------------
    // PATCH /api/bookings/{id}/checkin
    // CONFIRMED → CHECKED_IN
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/checkin")
    public ResponseEntity<BookingDTO.Response> checkinBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.checkinBooking(id));
    }

    // ----------------------------------------------------------------
    // PATCH /api/bookings/{id}/checkout
    // CHECKED_IN → CHECKED_OUT
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/checkout")
    public ResponseEntity<BookingDTO.Response> checkoutBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.checkoutBooking(id));
    }

    // ----------------------------------------------------------------
    // PATCH /api/bookings/{id}/cancel
    // any active status → CANCELLED
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BookingDTO.Response> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelBooking(id));
    }
}
