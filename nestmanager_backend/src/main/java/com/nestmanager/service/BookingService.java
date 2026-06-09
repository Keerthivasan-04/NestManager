package com.nestmanager.service;

import com.nestmanager.dto.BookingDTO;
import com.nestmanager.exception.DuplicateResourceException;
import com.nestmanager.exception.ResourceNotFoundException;
import com.nestmanager.model.Booking;
import com.nestmanager.model.Booking.BookingStatus;
import com.nestmanager.model.Room;
import com.nestmanager.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * BookingService — all business logic for bookings
 *
 * Responsibilities:
 *  - CRUD operations for bookings
 *  - Auto-generate booking code (BK-001, BK-002 ...)
 *  - Prevent double booking (same room, same date)
 *  - Status transitions: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT
 *  - Cancel booking
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomService       roomService;

    // ----------------------------------------------------------------
    // GET ALL BOOKINGS
    // GET /api/bookings  or  GET /api/bookings?status=PENDING
    // ----------------------------------------------------------------

    public List<BookingDTO.Response> getAllBookings() {
        return bookingRepository.findAll()
                .stream()
                .map(BookingDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<BookingDTO.Response> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status)
                .stream()
                .map(BookingDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------------------
    // GET ONE BOOKING
    // GET /api/bookings/{id}
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public BookingDTO.Response getBookingById(Long id) {
        return BookingDTO.Response.from(findBookingById(id));
    }

    // ----------------------------------------------------------------
    // CREATE BOOKING
    // POST /api/bookings
    // ----------------------------------------------------------------

    public BookingDTO.Response createBooking(BookingDTO.Request request) {

        // Double booking check — prevent same room on same date
        boolean conflict = bookingRepository.existsConflictingBooking(
                request.getRoomNumber(),
                request.getCheckInDate(),
                null   // null = no booking to exclude (new booking)
        );

        if (conflict) {
            throw new DuplicateResourceException(
                    "Room " + request.getRoomNumber() +
                    " already has an active booking on " + request.getCheckInDate()
            );
        }

        // Find the room
        Room room = roomService.findRoomByNumber(request.getRoomNumber());

        Booking booking = Booking.builder()
                .bookingCode(generateBookingCode())
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .guestEmail(request.getGuestEmail())
                .guestsCount(request.getGuestsCount())
                .room(room)
                .bookingType(request.getBookingType())
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .amount(request.getAmount())
                .advancePaid(request.getAdvancePaid())
                .status(request.getStatus() != null
                        ? request.getStatus() : BookingStatus.PENDING)
                .paymentStatus(request.getPaymentStatus())
                .notes(request.getNotes())
                .build();

        Booking saved = bookingRepository.save(booking);
        return BookingDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // UPDATE BOOKING
    // PUT /api/bookings/{id}
    // ----------------------------------------------------------------

    public BookingDTO.Response updateBooking(Long id, BookingDTO.Request request) {

        Booking booking = findBookingById(id);

        // Double booking check — exclude this booking itself
        boolean conflict = bookingRepository.existsConflictingBooking(
                request.getRoomNumber(),
                request.getCheckInDate(),
                id   // exclude current booking from conflict check
        );

        if (conflict) {
            throw new DuplicateResourceException(
                    "Room " + request.getRoomNumber() +
                    " already has an active booking on " + request.getCheckInDate()
            );
        }

        Room room = roomService.findRoomByNumber(request.getRoomNumber());

        booking.setGuestName(request.getGuestName());
        booking.setGuestPhone(request.getGuestPhone());
        booking.setGuestEmail(request.getGuestEmail());
        booking.setGuestsCount(request.getGuestsCount());
        booking.setRoom(room);
        booking.setBookingType(request.getBookingType());
        booking.setCheckInDate(request.getCheckInDate());
        booking.setCheckOutDate(request.getCheckOutDate());
        booking.setAmount(request.getAmount());
        booking.setAdvancePaid(request.getAdvancePaid());
        booking.setStatus(request.getStatus());
        booking.setPaymentStatus(request.getPaymentStatus());
        booking.setNotes(request.getNotes());

        Booking saved = bookingRepository.save(booking);
        return BookingDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // STATUS TRANSITIONS
    // PATCH /api/bookings/{id}/confirm
    // PATCH /api/bookings/{id}/checkin
    // PATCH /api/bookings/{id}/checkout
    // PATCH /api/bookings/{id}/cancel
    // ----------------------------------------------------------------

    public BookingDTO.Response confirmBooking(Long id) {
        return changeStatus(id, BookingStatus.CONFIRMED, BookingStatus.PENDING);
    }

    public BookingDTO.Response checkinBooking(Long id) {
        return changeStatus(id, BookingStatus.CHECKED_IN, BookingStatus.CONFIRMED);
    }

    public BookingDTO.Response checkoutBooking(Long id) {
        return changeStatus(id, BookingStatus.CHECKED_OUT, BookingStatus.CHECKED_IN);
    }

    public BookingDTO.Response cancelBooking(Long id) {
        Booking booking = findBookingById(id);

        if (booking.getStatus() == BookingStatus.CHECKED_OUT) {
            throw new IllegalStateException("Cannot cancel a completed booking");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return BookingDTO.Response.from(bookingRepository.save(booking));
    }

    private BookingDTO.Response changeStatus(Long id,
                                              BookingStatus newStatus,
                                              BookingStatus requiredCurrentStatus) {
        Booking booking = findBookingById(id);

        if (booking.getStatus() != requiredCurrentStatus) {
            throw new IllegalStateException(
                    "Cannot move to " + newStatus + ". " +
                    "Booking must be in " + requiredCurrentStatus +
                    " status (currently: " + booking.getStatus() + ")"
            );
        }

        booking.setStatus(newStatus);
        return BookingDTO.Response.from(bookingRepository.save(booking));
    }

    // ----------------------------------------------------------------
    // AUTO-GENERATE BOOKING CODE
    // Format: BK-001, BK-002 ... BK-999
    // ----------------------------------------------------------------

    private String generateBookingCode() {
        return bookingRepository.findLatestBooking()
                .map(latest -> {
                    // Extract number from "BK-009" → 9 → next = 10 → "BK-010"
                    String code = latest.getBookingCode();
                    int num = Integer.parseInt(code.replace("BK-", ""));
                    return String.format("BK-%03d", num + 1);
                })
                .orElse("BK-001");   // First booking ever
    }

    // ----------------------------------------------------------------
    // INTERNAL HELPER
    // ----------------------------------------------------------------

    public Booking findBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + id
                ));
    }
}
