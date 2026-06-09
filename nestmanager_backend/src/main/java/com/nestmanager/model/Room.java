package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Room — a physical room or dormitory in the property
 *
 * Table: rooms
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ----------------------------------------------------------------
    // Room identity
    // ----------------------------------------------------------------

    @Column(nullable = false, unique = true, length = 20)
    private String roomNumber;          // e.g. "101", "202"

    @Column(length = 50)
    private String floor;               // e.g. "Ground", "1st", "2nd"

    // ----------------------------------------------------------------
    // Room type
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoomType type;              // SINGLE, DOUBLE, SHARED, SUITE

    // ----------------------------------------------------------------
    // Capacity & occupancy
    // ----------------------------------------------------------------

    @Column(nullable = false)
    private Integer capacity;           // Total beds in the room

    @Column(nullable = false)
    @Builder.Default
    private Integer occupiedBeds = 0;   // Currently occupied beds

    // ----------------------------------------------------------------
    // Pricing
    // ----------------------------------------------------------------

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerMonth;

    // ----------------------------------------------------------------
    // Status
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoomStatus status = RoomStatus.VACANT;

    // ----------------------------------------------------------------
    // Details
    // ----------------------------------------------------------------

    @Column(length = 255)
    private String amenities;           // Comma-separated: "AC, WiFi, Attached Bath"

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ----------------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------------

    // One room can have many tenants (over time)
    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Tenant> tenants = new ArrayList<>();

    // One room can have many bookings
    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Booking> bookings = new ArrayList<>();

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
    // Helper method — auto-update status based on occupancy
    // Called by TenantService when a tenant checks in or out
    // ----------------------------------------------------------------

    public void recalculateStatus() {
        if (this.status == RoomStatus.MAINTENANCE) return; // don't override maintenance
        if (this.occupiedBeds >= this.capacity) {
            this.status = RoomStatus.OCCUPIED;
        } else {
            this.status = RoomStatus.VACANT;
        }
    }

    // ----------------------------------------------------------------
    // Enums
    // ----------------------------------------------------------------

    public enum RoomType {
        SINGLE,
        DOUBLE,
        SHARED,
        SUITE
    }

    public enum RoomStatus {
        VACANT,
        OCCUPIED,
        MAINTENANCE
    }
}
