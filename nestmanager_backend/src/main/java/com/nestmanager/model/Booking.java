package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Booking — a room reservation made by a guest
 *
 * A booking goes through these status transitions:
 * PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT
 *                     ↘ CANCELLED (from any state except CHECKED_OUT)
 *
 * Table: bookings
 */
@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ----------------------------------------------------------------
    // Auto-generated booking reference (e.g. "BK-001")
    // Set by BookingService on create
    // ----------------------------------------------------------------

    @Column(unique = true, length = 20)
    private String bookingCode;

    // ----------------------------------------------------------------
    // Guest information
    // Note: guests are NOT tenants — they are separate people
    // who make a booking (they may become tenants after check-in)
    // ----------------------------------------------------------------

    @Column(nullable = false, length = 100)
    private String guestName;

    @Column(nullable = false, length = 20)
    private String guestPhone;

    @Column(length = 100)
    private String guestEmail;

    @Column(nullable = false)
    @Builder.Default
    private Integer guestsCount = 1;

    // ----------------------------------------------------------------
    // Room assignment
    // ManyToOne — one room can have many bookings (over time)
    // ----------------------------------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    // ----------------------------------------------------------------
    // Booking details
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookingType bookingType = BookingType.MONTHLY;

    @Column(nullable = false)
    private LocalDate checkInDate;

    private LocalDate checkOutDate;

    // ----------------------------------------------------------------
    // Financial
    // ----------------------------------------------------------------

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal advancePaid = BigDecimal.ZERO;

    // ----------------------------------------------------------------
    // Status
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    // ----------------------------------------------------------------
    // Notes
    // ----------------------------------------------------------------

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ----------------------------------------------------------------
    // Timestamps
    // ----------------------------------------------------------------

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ----------------------------------------------------------------
    // Helper — get room number safely
    // ----------------------------------------------------------------

    public String getRoomNumber() {
        return room != null ? room.getRoomNumber() : null;
    }

    // ----------------------------------------------------------------
    // Enums
    // ----------------------------------------------------------------

    public enum BookingType {
        MONTHLY,
        WEEKLY,
        DAILY
    }

    public enum BookingStatus {
        PENDING,        // Booking received, not yet confirmed
        CONFIRMED,      // Confirmed, awaiting check-in
        CHECKED_IN,     // Guest has checked in
        CHECKED_OUT,    // Guest has checked out
        CANCELLED       // Booking cancelled
    }

    public enum PaymentStatus {
        UNPAID,
        PARTIAL,
        PAID
    }
}
