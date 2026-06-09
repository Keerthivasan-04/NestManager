package com.nestmanager.service;

import com.nestmanager.dto.PaymentDTO;
import com.nestmanager.exception.ResourceNotFoundException;
import com.nestmanager.model.Payment;
import com.nestmanager.model.Payment.PaymentStatus;
import com.nestmanager.model.Tenant;
import com.nestmanager.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * PaymentService — all business logic for payments
 *
 * Responsibilities:
 *  - CRUD operations for payments
 *  - Auto-generate receipt numbers (REC-001, REC-002 ...)
 *  - Mark payment as paid (quick action from table)
 *  - Return payment alerts (overdue + pending) for dashboard
 *  - Update tenant rentStatus after payment changes
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TenantService     tenantService;

    // ----------------------------------------------------------------
    // GET ALL PAYMENTS
    // GET /api/payments  or  GET /api/payments?status=OVERDUE
    // ----------------------------------------------------------------

    public List<PaymentDTO.Response> getAllPayments() {
        return paymentRepository.findAll()
                .stream()
                .map(PaymentDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<PaymentDTO.Response> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status)
                .stream()
                .map(PaymentDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<PaymentDTO.Response> getPaymentAlerts() {
        return paymentRepository.findPaymentAlerts()
                .stream()
                .map(PaymentDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------------------
    // GET ONE PAYMENT
    // GET /api/payments/{id}
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public PaymentDTO.Response getPaymentById(Long id) {
        return PaymentDTO.Response.from(findPaymentById(id));
    }

    // ----------------------------------------------------------------
    // CREATE PAYMENT
    // POST /api/payments
    // ----------------------------------------------------------------

    public PaymentDTO.Response createPayment(PaymentDTO.Request request) {

        Tenant tenant = tenantService.findTenantById(request.getTenantId());

        Payment payment = Payment.builder()
                .receiptNumber(generateReceiptNumber())
                .tenant(tenant)
                .roomNumber(request.getRoomNumber() != null
                        ? request.getRoomNumber()
                        : tenant.getRoomNumber())
                .forMonth(request.getForMonth())
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .transactionId(request.getTransactionId())
                .dueDate(request.getDueDate())
                .paidDate(request.getPaidDate())
                .status(request.getStatus())
                .notes(request.getNotes())
                .build();

        Payment saved = paymentRepository.save(payment);

        // Update tenant's rent status based on this payment
        updateTenantRentStatus(tenant);

        return PaymentDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // UPDATE PAYMENT
    // PUT /api/payments/{id}
    // ----------------------------------------------------------------

    public PaymentDTO.Response updatePayment(Long id, PaymentDTO.Request request) {

        Payment payment = findPaymentById(id);

        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setForMonth(request.getForMonth());
        payment.setPaidDate(request.getPaidDate());
        payment.setDueDate(request.getDueDate());
        payment.setStatus(request.getStatus());
        payment.setTransactionId(request.getTransactionId());
        payment.setNotes(request.getNotes());

        Payment saved = paymentRepository.save(payment);

        // Re-evaluate tenant rent status
        if (payment.getTenant() != null) {
            updateTenantRentStatus(payment.getTenant());
        }

        return PaymentDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // MARK PAID
    // PATCH /api/payments/{id}/mark-paid
    // ----------------------------------------------------------------

    public PaymentDTO.Response markPaid(Long id, PaymentDTO.MarkPaidRequest request) {

        Payment payment = findPaymentById(id);

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidDate(request.getPaidDate());
        payment.setPaymentMethod(request.getPaymentMethod());

        if (request.getTransactionId() != null) {
            payment.setTransactionId(request.getTransactionId());
        }

        Payment saved = paymentRepository.save(payment);

        // Update tenant rent status to PAID
        if (payment.getTenant() != null) {
            updateTenantRentStatus(payment.getTenant());
        }

        return PaymentDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // DELETE PAYMENT
    // DELETE /api/payments/{id}
    // ----------------------------------------------------------------

    public void deletePayment(Long id) {
        Payment payment = findPaymentById(id);
        Tenant tenant = payment.getTenant();
        paymentRepository.delete(payment);

        // Re-evaluate tenant rent status after deletion
        if (tenant != null) {
            updateTenantRentStatus(tenant);
        }
    }

    // ----------------------------------------------------------------
    // UPDATE TENANT RENT STATUS
    // Called after every payment create/update/delete
    // Sets tenant.rentStatus based on their latest payment
    // ----------------------------------------------------------------

    private void updateTenantRentStatus(Tenant tenant) {
        List<Payment> payments = paymentRepository.findByTenantId(tenant.getId());

        if (payments.isEmpty()) {
            tenant.setRentStatus(Tenant.RentStatus.PENDING);
            return;
        }

        // If any payment is OVERDUE → tenant is OVERDUE
        boolean hasOverdue = payments.stream()
                .anyMatch(p -> p.getStatus() == PaymentStatus.OVERDUE);

        // If any payment is PENDING → tenant is PENDING
        boolean hasPending = payments.stream()
                .anyMatch(p -> p.getStatus() == PaymentStatus.PENDING
                            || p.getStatus() == PaymentStatus.PARTIAL);

        if (hasOverdue) {
            tenant.setRentStatus(Tenant.RentStatus.OVERDUE);
        } else if (hasPending) {
            tenant.setRentStatus(Tenant.RentStatus.PENDING);
        } else {
            tenant.setRentStatus(Tenant.RentStatus.PAID);
        }

        tenantService.findTenantById(tenant.getId());
    }

    // ----------------------------------------------------------------
    // AUTO-GENERATE RECEIPT NUMBER
    // Format: REC-001, REC-002 ... REC-999
    // ----------------------------------------------------------------

    private String generateReceiptNumber() {
        return paymentRepository.findLatestPayment()
                .map(latest -> {
                    String rec = latest.getReceiptNumber();
                    int num = Integer.parseInt(rec.replace("REC-", ""));
                    return String.format("REC-%03d", num + 1);
                })
                .orElse("REC-001");
    }

    // ----------------------------------------------------------------
    // INTERNAL HELPER
    // ----------------------------------------------------------------

    public Payment findPaymentById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payment not found with id: " + id
                ));
    }
}
