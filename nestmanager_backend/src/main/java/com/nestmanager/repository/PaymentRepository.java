package com.nestmanager.repository;

import com.nestmanager.model.Payment;
import com.nestmanager.model.Payment.PaymentStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReceiptNumber(String receiptNumber);

    @Query("SELECT p FROM Payment p WHERE p.tenant.id = :tenantId")
    List<Payment> findByTenantId(@Param("tenantId") Long tenantId);

    @Query("SELECT COUNT(p) > 0 FROM Payment p WHERE p.tenant.id = :tenantId AND p.forMonth = :forMonth")
    boolean existsByTenantIdAndForMonth(
            @Param("tenantId") Long tenantId,
            @Param("forMonth") String forMonth);

    List<Payment> findByStatus(PaymentStatus status);

    List<Payment> findByForMonth(String forMonth);

    List<Payment> findByStatusAndForMonth(PaymentStatus status, String forMonth);

    List<Payment> findByPaymentMethod(Payment.PaymentMethod paymentMethod);

    long countByStatus(PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE " +
            "p.status = 'PAID' AND p.forMonth = :forMonth")
    BigDecimal sumPaidAmountForMonth(@Param("forMonth") String forMonth);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'PENDING'")
    BigDecimal sumPendingAmount();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'OVERDUE'")
    BigDecimal sumOverdueAmount();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'PAID'")
    BigDecimal sumTotalRevenue();

    // PostgreSQL-compatible: use EXTRACT instead of MONTH/YEAR
    @Query("SELECT EXTRACT(MONTH FROM p.paidDate), COALESCE(SUM(p.amount), 0) " +
            "FROM Payment p WHERE p.status = 'PAID' AND EXTRACT(YEAR FROM p.paidDate) = :year " +
            "GROUP BY EXTRACT(MONTH FROM p.paidDate) ORDER BY EXTRACT(MONTH FROM p.paidDate)")
    List<Object[]> monthlyRevenueByYear(@Param("year") int year);

    // PostgreSQL-compatible: use EXTRACT instead of MONTH/YEAR
    @Query("SELECT EXTRACT(MONTH FROM p.dueDate), p.status, COALESCE(SUM(p.amount), 0) " +
            "FROM Payment p WHERE EXTRACT(YEAR FROM p.dueDate) = :year " +
            "GROUP BY EXTRACT(MONTH FROM p.dueDate), p.status " +
            "ORDER BY EXTRACT(MONTH FROM p.dueDate)")
    List<Object[]> monthlyBreakdownByYear(@Param("year") int year);

    @Query("SELECT p FROM Payment p WHERE p.status IN ('PENDING') AND p.dueDate < :today")
    List<Payment> findOverduePayments(@Param("today") LocalDate today);

    // PostgreSQL-compatible: use Spring Data Pageable instead of LIMIT 1
    @Query("SELECT p FROM Payment p ORDER BY p.id DESC")
    List<Payment> findLatestPayments(PageRequest pageable);

    default Optional<Payment> findLatestPayment() {
        List<Payment> results = findLatestPayments(PageRequest.of(0, 1));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Query("SELECT p FROM Payment p WHERE p.status IN ('OVERDUE', 'PENDING') " +
            "ORDER BY p.status DESC, p.dueDate ASC")
    List<Payment> findPaymentAlerts();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE " +
            "p.tenant.id = :tenantId AND p.status = 'PAID' AND EXTRACT(YEAR FROM p.paidDate) = :year")
    BigDecimal sumPaidByTenantForYear(
            @Param("tenantId") Long tenantId,
            @Param("year") int year);
}