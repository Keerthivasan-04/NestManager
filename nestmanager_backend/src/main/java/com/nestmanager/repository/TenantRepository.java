package com.nestmanager.repository;

import com.nestmanager.model.Tenant;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.model.Tenant.RentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    @Query("SELECT t FROM Tenant t LEFT JOIN FETCH t.room")
    List<Tenant> findAllWithRoom();

    @Query("SELECT t FROM Tenant t LEFT JOIN FETCH t.room WHERE t.status = :status ORDER BY t.name ASC")
    List<Tenant> findByStatusWithRoom(@Param("status") TenantStatus status);

    List<Tenant> findByStatus(TenantStatus status);

    List<Tenant> findByStatusOrderByNameAsc(TenantStatus status);

    List<Tenant> findByRoomRoomNumber(String roomNumber);

    List<Tenant> findByRoomRoomNumberAndStatus(String roomNumber, TenantStatus status);

    long countByStatus(TenantStatus status);

    long countByRentStatus(RentStatus rentStatus);

    @Query("SELECT t FROM Tenant t WHERE t.status = 'ACTIVE' " +
            "AND t.expectedCheckOut IS NOT NULL " +
            "AND t.expectedCheckOut BETWEEN :today AND :futureDate")
    List<Tenant> findTenantsWithUpcomingCheckout(
            @Param("today") LocalDate today,
            @Param("futureDate") LocalDate futureDate);

    List<Tenant> findByStatusAndRentStatus(TenantStatus status, RentStatus rentStatus);

    // PostgreSQL-compatible: use EXTRACT instead of YEAR/MONTH
    @Query("SELECT COUNT(t) FROM Tenant t WHERE " +
            "EXTRACT(YEAR FROM t.checkInDate) = :year AND " +
            "EXTRACT(MONTH FROM t.checkInDate) = :month")
    long countNewTenantsInMonth(@Param("year") int year, @Param("month") int month);

    @Query("SELECT t FROM Tenant t WHERE " +
            "LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "t.phone LIKE CONCAT('%', :query, '%')")
    List<Tenant> searchByNameOrPhone(@Param("query") String query);
}