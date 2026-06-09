package com.nestmanager.controller;

import com.nestmanager.dto.DashboardSummaryDTO;
import com.nestmanager.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * DashboardController — REST endpoints for the dashboard page
 *
 * Endpoints:
 *  GET /api/dashboard/summary       → 6 stat cards, badge counts, trends
 *  GET /api/dashboard/activity      → recent 5 activity items
 *  GET /api/dashboard/revenue       → monthly revenue chart data (?months=6)
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // ----------------------------------------------------------------
    // GET /api/dashboard/summary
    //
    // Returns everything needed for the dashboard stat cards:
    //  - Room counts (total, vacant, occupied, maintenance)
    //  - Tenant count
    //  - Monthly revenue
    //  - Pending payments amount
    //  - Badge counts (pending bookings, overdue payments, unread notifs)
    //  - Trend strings for each card
    // ----------------------------------------------------------------
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDTO> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    // ----------------------------------------------------------------
    // GET /api/dashboard/activity
    //
    // Returns the 5 most recent activity items for the
    // "Recent Activity" panel on the dashboard
    // ----------------------------------------------------------------
    @GetMapping("/activity")
    public ResponseEntity<List<DashboardSummaryDTO.ActivityItem>> getActivity() {
        return ResponseEntity.ok(dashboardService.getRecentActivity());
    }

    // ----------------------------------------------------------------
    // GET /api/dashboard/revenue?months=6
    // GET /api/dashboard/revenue?months=3
    //
    // Returns labels + values arrays for the revenue chart.
    // Defaults to 6 months if param is missing.
    // ----------------------------------------------------------------
    @GetMapping("/revenue")
    public ResponseEntity<DashboardSummaryDTO.RevenueData> getRevenue(
            @RequestParam(defaultValue = "6") int months) {

        // Clamp to valid range
        int clampedMonths = Math.max(1, Math.min(12, months));
        return ResponseEntity.ok(dashboardService.getRevenueData(clampedMonths));
    }
}
