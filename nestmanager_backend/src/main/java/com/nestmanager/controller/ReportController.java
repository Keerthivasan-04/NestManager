package com.nestmanager.controller;

import com.nestmanager.dto.ReportDTO;
import com.nestmanager.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * ReportController — REST endpoints for the reports page
 *
 * Endpoints:
 *  GET /api/reports/summary?year={year} → full annual report
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // ----------------------------------------------------------------
    // GET /api/reports/summary?year=2025
    //
    // Returns the complete annual report for the given year.
    // Defaults to the current year if no param is provided.
    //
    // Used by reports.js to populate:
    //  - 6 KPI cards
    //  - Monthly revenue bar/line chart
    //  - Room status doughnut chart
    //  - Payment stacked bar chart
    //  - Room type pie chart
    //  - Key metrics summary grid
    //  - Tenant rent summary table
    // ----------------------------------------------------------------
    @GetMapping("/summary")
    public ResponseEntity<ReportDTO> getSummary(
            @RequestParam(required = false) Integer year) {

        int reportYear = (year != null) ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(reportService.buildReport(reportYear));
    }
}
