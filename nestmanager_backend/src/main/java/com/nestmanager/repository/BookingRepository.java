package com.nestmanager.repository;

import com.nestmanager.model.Booking;
import com.nestmanager.model.Booking.BookingStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findByStatus(BookingStatus status);

    List<Booking> findByRoomRoomNumber(String roomNumber);

    long countByStatus(BookingStatus status);

    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE " +
            "b.room.roomNumber = :roomNumber AND " +
            "b.status NOT IN ('CANCELLED', 'CHECKED_OUT') AND " +
            "b.checkInDate = :checkInDate AND " +
            "(:excludeId IS NULL OR b.id != :excludeId)")
    boolean existsConflictingBooking(
            @Param("roomNumber") String roomNumber,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("excludeId") Long excludeId);

    // PostgreSQL-compatible: use EXTRACT instead of YEAR/MONTH
    @Query("SELECT b FROM Booking b WHERE " +
            "EXTRACT(YEAR FROM b.checkInDate) = :year AND " +
            "EXTRACT(MONTH FROM b.checkInDate) = :month")
    List<Booking> findByCheckInMonth(
            @Param("year") int year,
            @Param("month") int month);

    // PostgreSQL-compatible: use Spring Data Pageable instead of LIMIT 1
    @Query("SELECT b FROM Booking b ORDER BY b.id DESC")
    List<Booking> findLatestBookings(PageRequest pageable);

    default Optional<Booking> findLatestBooking() {
        List<Booking> results = findLatestBookings(PageRequest.of(0, 1));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Query("SELECT b FROM Booking b WHERE " +
            "b.status = 'CHECKED_IN' AND " +
            "b.checkOutDate BETWEEN :today AND :futureDate")
    List<Booking> findBookingsWithUpcomingCheckout(
            @Param("today") LocalDate today,
            @Param("futureDate") LocalDate futureDate);

    // PostgreSQL-compatible: use EXTRACT instead of YEAR
    @Query("SELECT COUNT(b) FROM Booking b WHERE EXTRACT(YEAR FROM b.checkInDate) = :year")
    long countByYear(@Param("year") int year);
}