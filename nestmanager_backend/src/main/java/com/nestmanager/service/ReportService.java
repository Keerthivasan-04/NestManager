package com.nestmanager.service;

import com.nestmanager.dto.ReportDTO;
import com.nestmanager.model.Payment.PaymentStatus;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ReportService — builds the full annual report
 *
 * Called by GET /api/reports/summary?year={year}
 * Returns one large ReportDTO used by the entire reports page.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final RoomRepository    roomRepository;
    private final TenantRepository  tenantRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    // ----------------------------------------------------------------
    // BUILD FULL REPORT
    // GET /api/reports/summary?year={year}
    // ----------------------------------------------------------------

    public ReportDTO buildReport(int year) {

        // ---- Room data ----
        long totalRooms       = roomRepository.count();
        long occupiedRooms    = roomRepository.countByStatus(RoomStatus.OCCUPIED);
        long vacantRooms      = roomRepository.countByStatus(RoomStatus.VACANT);
        long maintenanceRooms = roomRepository.countByStatus(RoomStatus.MAINTENANCE);

        double avgOccupancyRate = totalRooms > 0
                ? (double) occupiedRooms / totalRooms * 100
                : 0;

        // ---- Tenant data ----
        long totalTenants = tenantRepository.countByStatus(TenantStatus.ACTIVE);

        LocalDate now = LocalDate.now();
        long newTenantsThisMonth = tenantRepository
                .countNewTenantsInMonth(now.getYear(), now.getMonthValue());

        // ---- Booking data ----
        long totalBookings = bookingRepository.countByYear(year);

        // ---- Payment data ----
        BigDecimal annualRevenue  = paymentRepository.sumTotalRevenue();
        BigDecimal totalPending   = paymentRepository.sumPendingAmount();
        BigDecimal totalOverdue   = paymentRepository.sumOverdueAmount();

        // Collection rate = paid / (paid + pending + overdue) * 100
        BigDecimal collectable = annualRevenue.add(totalPending).add(totalOverdue);
        double collectionRate  = collectable.compareTo(BigDecimal.ZERO) > 0
                ? annualRevenue.divide(collectable, 4, RoundingMode.HALF_UP)
                               .multiply(BigDecimal.valueOf(100))
                               .doubleValue()
                : 0;

        // ---- Monthly revenue array (12 months) ----
        List<BigDecimal> monthlyRevenue  = buildMonthlyArray(year, "PAID");
        List<BigDecimal> monthlyPaid     = monthlyRevenue;
        List<BigDecimal> monthlyPending  = buildMonthlyArray(year, "PENDING");
        List<BigDecimal> monthlyOverdue  = buildMonthlyArray(year, "OVERDUE");

        // ---- Room type distribution ----
        Map<String, Long> roomTypes = buildRoomTypeMap();

        // ---- Avg room rent ----
        BigDecimal avgRoomRent = totalRooms > 0
                ? annualRevenue.divide(
                    BigDecimal.valueOf(totalRooms * 12), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // ---- Highest revenue month ----
        String highestMonth = findHighestRevenueMonth(monthlyRevenue, year);

        // ---- Tenant rent summary table ----
        List<ReportDTO.TenantSummary> tenantSummaries = buildTenantSummaries(year);

        return ReportDTO.builder()
                .year(year)
                .annualRevenue(annualRevenue)
                .avgOccupancyRate(Math.round(avgOccupancyRate * 10.0) / 10.0)
                .totalTenants(totalTenants)
                .collectionRate(Math.round(collectionRate * 10.0) / 10.0)
                .totalBookings(totalBookings)
                .avgStayDays(28L)   // default — can be computed from booking dates
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .vacantRooms(vacantRooms)
                .maintenanceRooms(maintenanceRooms)
                .newTenantsThisMonth(newTenantsThisMonth)
                .totalPending(totalPending)
                .totalOverdue(totalOverdue)
                .avgRoomRent(avgRoomRent)
                .popularRoomType("Double")   // can be derived from roomTypes map
                .highestRevenueMonth(highestMonth)
                .changes(ReportDTO.Changes.builder()
                        .revenue("+0%")
                        .occupancy("+0%")
                        .tenants("+0")
                        .collection("+0%")
                        .bookings("+0")
                        .avgStay("~28 days")
                        .build())
                .monthlyRevenue(monthlyRevenue)
                .monthlyPaid(monthlyPaid)
                .monthlyPending(monthlyPending)
                .monthlyOverdue(monthlyOverdue)
                .roomTypes(roomTypes)
                .tenants(tenantSummaries)
                .build();
    }

    // ----------------------------------------------------------------
    // HELPERS
    // ----------------------------------------------------------------

    /**
     * Builds a 12-element list of monthly amounts for a given year and status.
     * Index 0 = January, Index 11 = December.
     * Months with no data = BigDecimal.ZERO.
     */
    private List<BigDecimal> buildMonthlyArray(int year, String status) {
        List<Object[]> raw = paymentRepository.monthlyBreakdownByYear(year);

        // Initialize all 12 months to zero
        BigDecimal[] months = new BigDecimal[12];
        Arrays.fill(months, BigDecimal.ZERO);

        for (Object[] row : raw) {
            int month       = ((Number) row[0]).intValue() - 1;  // 1-based → 0-based
            String rowStatus = row[1].toString();
            BigDecimal amt  = (BigDecimal) row[2];

            if (rowStatus.equals(status) && month >= 0 && month < 12) {
                months[month] = amt;
            }
        }

        return Arrays.asList(months);
    }

    /**
     * Builds room type distribution map.
     * e.g. { "SINGLE": 4, "DOUBLE": 3, "SHARED": 2, "SUITE": 1 }
     */
    private Map<String, Long> buildRoomTypeMap() {
        List<Object[]> raw = roomRepository.countByType();
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : raw) {
            map.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return map;
    }

    /**
     * Finds the month with the highest revenue.
     * Returns e.g. "March 2025"
     */
    private String findHighestRevenueMonth(List<BigDecimal> monthly, int year) {
        int maxIndex = 0;
        BigDecimal maxVal = BigDecimal.ZERO;
        for (int i = 0; i < monthly.size(); i++) {
            if (monthly.get(i).compareTo(maxVal) > 0) {
                maxVal = monthly.get(i);
                maxIndex = i;
            }
        }
        String monthName = Month.of(maxIndex + 1)
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        return monthName + " " + year;
    }

    /**
     * Builds the tenant rent summary rows for the reports table.
     */
    private List<ReportDTO.TenantSummary> buildTenantSummaries(int year) {
        return tenantRepository.findByStatus(TenantStatus.ACTIVE)
                .stream()
                .map(t -> {
                    BigDecimal paidYTD = paymentRepository
                            .sumPaidByTenantForYear(t.getId(), year);
                    BigDecimal pending = paymentRepository
                            .findByTenantId(t.getId())
                            .stream()
                            .filter(p -> p.getStatus() == PaymentStatus.PENDING
                                      || p.getStatus() == PaymentStatus.OVERDUE)
                            .map(p -> p.getAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return ReportDTO.TenantSummary.builder()
                            .id(t.getId())
                            .name(t.getName())
                            .phone(t.getPhone())
                            .roomNumber(t.getRoomNumber())
                            .rentPerMonth(t.getRentPerMonth())
                            .paidYTD(paidYTD)
                            .pendingAmt(pending)
                            .rentStatus(t.getRentStatus())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
