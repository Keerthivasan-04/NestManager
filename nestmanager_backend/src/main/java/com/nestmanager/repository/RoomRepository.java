package com.nestmanager.repository;

import com.nestmanager.model.Room;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Room.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * RoomRepository
 *
 * Used by:
 *  - RoomService       → CRUD, filter, availability check
 *  - TenantService     → find room by number to assign tenant
 *  - BookingService    → find available rooms for booking
 *  - DashboardService  → count rooms by status for summary
 *  - ReportService     → room type distribution for charts
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    // Find room by room number (e.g. "101")
    // Used to check duplicates on create and to assign tenants
    Optional<Room> findByRoomNumber(String roomNumber);

    // Check if room number already exists — used before creating a new room
    boolean existsByRoomNumber(String roomNumber);

    // Get all rooms filtered by status
    // Used by rooms page filter buttons (Vacant / Occupied / Maintenance)
    List<Room> findByStatus(RoomStatus status);

    // Get all rooms filtered by type
    // Used by rooms page type dropdown filter
    List<Room> findByType(RoomType type);

    // Get all rooms filtered by both status and type
    List<Room> findByStatusAndType(RoomStatus status, RoomType type);

    // Count rooms by status — used by dashboard summary cards
    long countByStatus(RoomStatus status);

    // Get all vacant rooms — used to populate room dropdowns in
    // Add Tenant modal and New Booking modal on the frontend
    List<Room> findByStatusOrderByRoomNumberAsc(RoomStatus status);

    // Count rooms by type — used by reports page room type pie chart
    @Query("SELECT r.type, COUNT(r) FROM Room r GROUP BY r.type")
    List<Object[]> countByType();
}
