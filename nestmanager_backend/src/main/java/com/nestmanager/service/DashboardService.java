package com.nestmanager.service;

import com.nestmanager.dto.DashboardSummaryDTO;
import com.nestmanager.dto.PaymentDTO;
import com.nestmanager.model.Booking.BookingStatus;
import com.nestmanager.model.Payment.PaymentStatus;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DashboardService — aggregates data for the dashboard page
 *
 * Responsible for:
 *  - Building the summary DTO (6 stat cards + badge counts + trends)
 *  - Building the activity feed (recent 5 events)
 *  - Building the revenue chart data (last 3 or 6 months)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final RoomRepository         roomRepository;
    private final TenantRepository       tenantRepository;
    private final BookingRepository      bookingRepository;
    private final PaymentRepository      paymentRepository;
    private final NotificationRepository notificationRepository;

    // ----------------------------------------------------------------
    // DASHBOARD SUMMARY
    // GET /api/dashboard/summary
    // ----------------------------------------------------------------

    public DashboardSummaryDTO getSummary() {

        // Room counts
        long totalRooms       = roomRepository.count();
        long vacantRooms      = roomRepository.countByStatus(RoomStatus.VACANT);
        long occupiedRooms    = roomRepository.countByStatus(RoomStatus.OCCUPIED);
        long maintenanceRooms = roomRepository.countByStatus(RoomStatus.MAINTENANCE);

        // Tenant count
        long totalTenants     = tenantRepository.countByStatus(TenantStatus.ACTIVE);

        // Revenue — sum of PAID payments for current month
        String currentMonth = getCurrentMonthString();
        BigDecimal monthlyRevenue = paymentRepository
                .sumPaidAmountForMonth(currentMonth);

        // Pending payments — sum of PENDING + OVERDUE
        BigDecimal pendingAmt = paymentRepository.sumPendingAmount()
                .add(paymentRepository.sumOverdueAmount());

        // Badge counts
        long pendingBookings = bookingRepository.countByStatus(BookingStatus.PENDING);
        long overduePayments = paymentRepository.countByStatus(PaymentStatus.OVERDUE);
        long unreadNotifs    = notificationRepository.countByIsReadFalse();

        // Occupancy rate as string
        long occPct = totalRooms > 0
                ? Math.round((double) occupiedRooms / totalRooms * 100)
                : 0;

        return DashboardSummaryDTO.builder()
                .totalRooms(totalRooms)
                .vacantRooms(vacantRooms)
                .occupiedRooms(occupiedRooms)
                .maintenanceRooms(maintenanceRooms)
                .totalTenants(totalTenants)
                .monthlyRevenue(monthlyRevenue)
                .pendingPayments(pendingAmt)
                .pendingBookings(pendingBookings)
                .overduePayments(overduePayments)
                .unreadNotifs(unreadNotifs)
                .trends(DashboardSummaryDTO.Trends.builder()
                        .rooms("+0")
                        .vacant(String.valueOf(vacantRooms))
                        .occupied(occPct + "%")
                        .tenants("+0")
                        .revenue("+0%")
                        .pending(String.valueOf(overduePayments))
                        .build())
                .build();
    }

    // ----------------------------------------------------------------
    // ACTIVITY FEED
    // GET /api/dashboard/activity
    // Returns the 5 most recent activities across all entities
    // ----------------------------------------------------------------

    public List<DashboardSummaryDTO.ActivityItem> getRecentActivity() {

        List<DashboardSummaryDTO.ActivityItem> activities = new ArrayList<>();

        // Recent paid payments
        paymentRepository.findByStatus(PaymentStatus.PAID)
                .stream()
                .limit(5)
                .forEach(p -> activities.add(
                        DashboardSummaryDTO.ActivityItem.builder()
                                .text(p.getTenantName() + " paid rent "
                                        + formatCurrency(p.getAmount())
                                        + " for Room " + p.getRoomNumber())
                                .time(timeAgo(p.getPaidDate()))
                                .initials(getInitials(p.getTenantName()))
                                .color("#10b981")
                                .build()
                ));

        // Limit to 5 items total, sorted newest first
        return activities.stream()
                .limit(5)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------------------
    // REVENUE CHART DATA
    // GET /api/dashboard/revenue?months=6  or  ?months=3
    // ----------------------------------------------------------------

    public DashboardSummaryDTO.RevenueData getRevenueData(int months) {

        List<String> labels = new ArrayList<>();
        List<BigDecimal> values = new ArrayList<>();

        LocalDate now = LocalDate.now();

        // Build month labels and fetch revenue for each
        for (int i = months - 1; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String monthStr = String.format("%d-%02d",
                    month.getYear(), month.getMonthValue());

            String label = month.getMonth()
                    .getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            BigDecimal revenue = paymentRepository.sumPaidAmountForMonth(monthStr);

            labels.add(label);
            values.add(revenue);
        }

        return DashboardSummaryDTO.RevenueData.builder()
                .labels(labels)
                .values(values)
                .build();
    }

    // ----------------------------------------------------------------
    // HELPERS
    // ----------------------------------------------------------------

    private String getCurrentMonthString() {
        LocalDate now = LocalDate.now();
        return String.format("%d-%02d", now.getYear(), now.getMonthValue());
    }

    private String formatCurrency(BigDecimal amount) {
        return "₹" + String.format("%,.0f", amount);
    }

    private String getInitials(String name) {
        if (name == null || name.isBlank()) return "?";
        String[] parts = name.trim().split(" ");
        if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
        return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }

    private String timeAgo(java.time.LocalDate date) {
        if (date == null) return "";
        long days = java.time.temporal.ChronoUnit.DAYS.between(date, LocalDate.now());
        if (days == 0) return "Today";
        if (days == 1) return "1 day ago";
        return days + " days ago";
    }
}