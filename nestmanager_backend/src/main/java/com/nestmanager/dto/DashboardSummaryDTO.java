package com.nestmanager.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * DashboardSummaryDTO — response shape for the dashboard page
 *
 * Returned by GET /api/dashboard/summary
 * Used by dashboard.js to populate:
 *  - 6 stat cards (rooms, tenants, revenue, pending)
 *  - Occupancy doughnut chart
 *  - Nav badge counts (pending bookings, overdue payments, unread notifs)
 *  - Trend badges on each stat card
 *
 * {
 *   "totalRooms": 10,
 *   "vacantRooms": 3,
 *   "occupiedRooms": 6,
 *   "maintenanceRooms": 1,
 *   "totalTenants": 10,
 *   "monthlyRevenue": 61800.00,
 *   "pendingPayments": 13000.00,
 *   "pendingBookings": 2,
 *   "overduePayments": 2,
 *   "unreadNotifs": 4,
 *   "trends": {
 *     "rooms": "+2",
 *     "vacant": "+1",
 *     "occupied": "75%",
 *     "tenants": "+3",
 *     "revenue": "+8%",
 *     "pending": "+2"
 *   }
 * }
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDTO {

    // ----------------------------------------------------------------
    // Room counts — occupancy doughnut chart + stat cards
    // ----------------------------------------------------------------
    private long totalRooms;
    private long vacantRooms;
    private long occupiedRooms;
    private long maintenanceRooms;

    // ----------------------------------------------------------------
    // Tenant counts — stat card
    // ----------------------------------------------------------------
    private long totalTenants;

    // ----------------------------------------------------------------
    // Financial — stat cards
    // ----------------------------------------------------------------
    private BigDecimal monthlyRevenue;     // Collected this month (PAID payments)
    private BigDecimal pendingPayments;    // Total pending + overdue amount

    // ----------------------------------------------------------------
    // Badge counts — nav sidebar badges
    // ----------------------------------------------------------------
    private long pendingBookings;          // Bookings with status = PENDING
    private long overduePayments;          // Payments with status = OVERDUE
    private long unreadNotifs;            // Unread notifications count

    // ----------------------------------------------------------------
    // Trend strings — shown under each stat card value
    // e.g. "+2", "+8%", "75%"
    // ----------------------------------------------------------------
    private Trends trends;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Trends {
        private String rooms;
        private String vacant;
        private String occupied;
        private String tenants;
        private String revenue;
        private String pending;
    }

    // ----------------------------------------------------------------
    // Activity item — recent activity feed on dashboard
    // Returned by GET /api/dashboard/activity
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActivityItem {
        private String text;        // e.g. "Arjun Sharma paid ₹5,500 for Room 101"
        private String time;        // e.g. "10 min ago"
        private String initials;    // e.g. "AS"
        private String color;       // e.g. "#10b981"
    }

    // ----------------------------------------------------------------
    // Revenue data — line/bar chart on dashboard
    // Returned by GET /api/dashboard/revenue?months=6
    //
    // {
    //   "labels": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    //   "values": [48000, 52000, 55000, 58000, 60000, 61800]
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RevenueData {
        private List<String> labels;
        private List<BigDecimal> values;
    }
}
