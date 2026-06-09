package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Payment — a rent or booking payment record
 *
 * Each row represents one month's rent payment for a tenant.
 * Receipt numbers are auto-generated (e.g. "REC-001").
 *
 * Table: payments
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ----------------------------------------------------------------
    // Auto-generated receipt number (e.g. "REC-001")
    // Set by PaymentService on create
    // ----------------------------------------------------------------

    @Column(unique = true, length = 20)
    private String receiptNumber;

    // ----------------------------------------------------------------
    // Tenant relationship
    // ManyToOne — one tenant can have many payment records
    // ----------------------------------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    // Denormalized for easy display in table without joins
    @Column(length = 20)
    private String roomNumber;

    // ----------------------------------------------------------------
    // Payment period
    // Stored as "YYYY-MM" string (e.g. "2025-03")
    // ----------------------------------------------------------------

    @Column(nullable = false, length = 7)
    private String forMonth;

    // ----------------------------------------------------------------
    // Amount
    // ----------------------------------------------------------------

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // ----------------------------------------------------------------
    // Payment method
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PaymentMethod paymentMethod;

    @Column(length = 100)
    private String transactionId;       // UPI ref, cheque number, NEFT ref, etc.

    // ----------------------------------------------------------------
    // Dates
    // ----------------------------------------------------------------

    private LocalDate dueDate;          // When rent was supposed to be paid

    private LocalDate paidDate;         // When it was actually paid (null if not paid)

    // ----------------------------------------------------------------
    // Status
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

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
    // Helper — get tenant name safely
    // ----------------------------------------------------------------

    public String getTenantName() {
        return tenant != null ? tenant.getName() : null;
    }

    public String getTenantPhone() {
        return tenant != null ? tenant.getPhone() : null;
    }

    public Long getTenantId() {
        return tenant != null ? tenant.getId() : null;
    }

    // ----------------------------------------------------------------
    // Enums
    // ----------------------------------------------------------------

    public enum PaymentMethod {
        UPI,
        CASH,
        BANK_TRANSFER,
        CHEQUE
    }

    public enum PaymentStatus {
        PAID,
        PENDING,
        OVERDUE,
        PARTIAL
    }
}
