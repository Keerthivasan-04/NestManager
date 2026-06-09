package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Settings — single-row configuration table for the property
 *
 * There will always be exactly ONE row in this table (id = 1).
 * On first startup, a default row is inserted by SettingsService.
 *
 * Table: settings
 */
@Entity
@Table(name = "settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settings {

    // Always 1 — single row table
    @Id
    private Long id = 1L;

    // ----------------------------------------------------------------
    // Property information
    // ----------------------------------------------------------------

    @Column(nullable = false, length = 150)
    @Builder.Default
    private String propertyName = "My Property";

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String ownerName = "Admin";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String phone = "";

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String gstin;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 50)
    private String city;

    @Column(length = 10)
    private String pincode;

    // ----------------------------------------------------------------
    // Billing rules
    // ----------------------------------------------------------------

    // Day of month rent is due (e.g. 5 = 5th of every month)
    @Column(nullable = false)
    @Builder.Default
    private Integer rentDueDay = 5;

    // Send reminder N days before due date
    @Column(nullable = false)
    @Builder.Default
    private Integer daysBefore = 3;

    // Late fee charged per day after grace period
    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal lateFeePerDay = BigDecimal.ZERO;

    // Days after due date before marking as overdue
    @Column(nullable = false)
    @Builder.Default
    private Integer gracePeriodDays = 5;

    // Security deposit in months of rent
    @Column(nullable = false)
    @Builder.Default
    private Integer depositMonths = 2;

    @Column(length = 5)
    @Builder.Default
    private String currency = "INR";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String receiptFooter = "Thank you for your payment.";

    // ----------------------------------------------------------------
    // Notification preferences
    // ----------------------------------------------------------------

    @Column(nullable = false)
    @Builder.Default
    private Boolean rentReminders = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean overdueAlerts = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean checkoutAlerts = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean bookingAlerts = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean tenantAlerts = true;

    // ----------------------------------------------------------------
    // Security settings
    // ----------------------------------------------------------------

    @Column(nullable = false)
    @Builder.Default
    private Boolean autoLogout = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean loginLimit = true;

    // 0 = never, otherwise minutes
    @Column(nullable = false)
    @Builder.Default
    private Integer sessionTimeoutMinutes = 30;

    // ----------------------------------------------------------------
    // Timestamps
    // ----------------------------------------------------------------

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
