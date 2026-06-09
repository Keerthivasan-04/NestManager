package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Tenant — a person currently staying or who has stayed at the property
 *
 * Table: tenants
 */
@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ----------------------------------------------------------------
    // Personal information
    // ----------------------------------------------------------------

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(columnDefinition = "TEXT")
    private String address;

    // ----------------------------------------------------------------
    // ID proof
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private IdProofType idProofType;

    @Column(nullable = false, length = 50)
    private String idProofNumber;

    // ----------------------------------------------------------------
    // Room assignment
    // ManyToOne — many tenants can be assigned to one room (shared)
    // ----------------------------------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    // ----------------------------------------------------------------
    // Stay details
    // ----------------------------------------------------------------

    @Column(nullable = false)
    private LocalDate checkInDate;

    private LocalDate expectedCheckOut;

    private LocalDate actualCheckOut;

    // ----------------------------------------------------------------
    // Financial
    // ----------------------------------------------------------------

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal rentPerMonth;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal securityDeposit = BigDecimal.ZERO;

    // ----------------------------------------------------------------
    // Emergency contact
    // ----------------------------------------------------------------

    @Column(length = 150)
    private String emergencyContact;    // "Name - Phone"

    // ----------------------------------------------------------------
    // Status
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TenantStatus status = TenantStatus.ACTIVE;

    // Derived from payments — set by PaymentService scheduler
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RentStatus rentStatus;

    // ----------------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------------

    @OneToMany(mappedBy = "tenant", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

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
    // Helper — get room number safely (room may be null after checkout)
    // ----------------------------------------------------------------

    public String getRoomNumber() {
        return room != null ? room.getRoomNumber() : null;
    }

    // ----------------------------------------------------------------
    // Enums
    // ----------------------------------------------------------------

    public enum TenantStatus {
        ACTIVE,
        CHECKED_OUT
    }

    public enum RentStatus {
        PAID,
        PENDING,
        OVERDUE
    }

    public enum Gender {
        MALE,
        FEMALE,
        OTHER
    }

    public enum IdProofType {
        AADHAAR,
        PAN,
        PASSPORT,
        VOTER_ID,
        DRIVING_LICENSE
    }
}
