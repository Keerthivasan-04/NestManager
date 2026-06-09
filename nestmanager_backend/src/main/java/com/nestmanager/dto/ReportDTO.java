package com.nestmanager.dto;

import com.nestmanager.model.Tenant.RentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * ReportDTO — response shape for the reports & analytics page
 *
 * Returned by GET /api/reports/summary?year={year}
 * Used by reports.js to populate:
 *  - 6 KPI cards
 *  - Monthly revenue bar/line chart (12-month array)
 *  - Room status doughnut chart
 *  - Payment collection stacked bar chart
 *  - Room type pie chart
 *  - Key metrics summary grid
 *  - Tenant rent summary table
 *
 * {
 *   "year": 2025,
 *   "annualRevenue": 492500.00,
 *   "avgOccupancyRate": 75.0,
 *   "totalTenants": 10,
 *   "collectionRate": 87.0,
 *   "totalBookings": 10,
 *   "avgStayDays": 28,
 *   "totalRooms": 10,
 *   "occupiedRooms": 6,
 *   "vacantRooms": 3,
 *   "maintenanceRooms": 1,
 *   ...
 * }
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportDTO {

    // ----------------------------------------------------------------
    // Year of the report
    // ----------------------------------------------------------------
    private int year;

    // ----------------------------------------------------------------
    // KPI cards
    // ----------------------------------------------------------------
    private BigDecimal annualRevenue;
    private double avgOccupancyRate;        // 0-100 percentage
    private long totalTenants;
    private double collectionRate;          // 0-100 percentage
    private long totalBookings;
    private long avgStayDays;

    // ----------------------------------------------------------------
    // Room status breakdown — doughnut chart
    // ----------------------------------------------------------------
    private long totalRooms;
    private long occupiedRooms;
    private long vacantRooms;
    private long maintenanceRooms;

    // ----------------------------------------------------------------
    // Additional metrics for summary grid
    // ----------------------------------------------------------------
    private long newTenantsThisMonth;
    private BigDecimal totalPending;
    private BigDecimal totalOverdue;
    private BigDecimal avgRoomRent;
    private String popularRoomType;         // e.g. "Double"
    private String highestRevenueMonth;     // e.g. "March 2025"

    // ----------------------------------------------------------------
    // Year-over-year changes — KPI change badges
    // e.g. "+12%", "+3", "~28 days"
    // ----------------------------------------------------------------
    private Changes changes;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Changes {
        private String revenue;
        private String occupancy;
        private String tenants;
        private String collection;
        private String bookings;
        private String avgStay;
    }

    // ----------------------------------------------------------------
    // Monthly revenue array — 12 elements (Jan=index 0, Dec=index 11)
    // Used by revenue bar/line chart
    // ----------------------------------------------------------------
    private List<BigDecimal> monthlyRevenue;

    // ----------------------------------------------------------------
    // Monthly payment breakdown — stacked bar chart
    // Each list has 12 elements (one per month)
    // ----------------------------------------------------------------
    private List<BigDecimal> monthlyPaid;
    private List<BigDecimal> monthlyPending;
    private List<BigDecimal> monthlyOverdue;

    // ----------------------------------------------------------------
    // Room type distribution — pie chart
    // Key = room type string, Value = count
    // e.g. { "SINGLE": 4, "DOUBLE": 3, "SHARED": 2, "SUITE": 1 }
    // ----------------------------------------------------------------
    private Map<String, Long> roomTypes;

    // ----------------------------------------------------------------
    // Tenant rent summary table rows
    // ----------------------------------------------------------------
    private List<TenantSummary> tenants;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TenantSummary {
        private Long id;
        private String name;
        private String phone;
        private String roomNumber;
        private BigDecimal rentPerMonth;
        private BigDecimal paidYTD;         // Total paid this year
        private BigDecimal pendingAmt;      // Outstanding amount
        private RentStatus rentStatus;      // PAID / PENDING / OVERDUE
    }
}
