package com.nestmanager.controller;

import com.nestmanager.dto.PaymentDTO;
import com.nestmanager.model.Payment.PaymentStatus;
import com.nestmanager.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * PaymentController — REST endpoints for payments
 *
 * Endpoints:
 *  GET    /api/payments               → all payments (optional ?status=OVERDUE)
 *  GET    /api/payments/alerts        → overdue + pending payments for dashboard
 *  GET    /api/payments/{id}          → one payment
 *  POST   /api/payments               → record new payment
 *  PUT    /api/payments/{id}          → update payment
 *  PATCH  /api/payments/{id}/mark-paid → mark as paid quickly
 *  DELETE /api/payments/{id}          → delete payment record
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // ----------------------------------------------------------------
    // GET /api/payments
    // GET /api/payments?status=OVERDUE
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<PaymentDTO.Response>> getAllPayments(
            @RequestParam(required = false) PaymentStatus status) {

        List<PaymentDTO.Response> payments = status != null
                ? paymentService.getPaymentsByStatus(status)
                : paymentService.getAllPayments();

        return ResponseEntity.ok(payments);
    }

    // ----------------------------------------------------------------
    // GET /api/payments/alerts
    // Returns overdue + pending payments for dashboard payment alerts panel
    // ----------------------------------------------------------------
    @GetMapping("/alerts")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentAlerts() {
        return ResponseEntity.ok(paymentService.getPaymentAlerts());
    }

    // ----------------------------------------------------------------
    // GET /api/payments/{id}
    // ----------------------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<PaymentDTO.Response> getPaymentById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    // ----------------------------------------------------------------
    // POST /api/payments
    // ----------------------------------------------------------------
    @PostMapping
    public ResponseEntity<PaymentDTO.Response> createPayment(
            @Valid @RequestBody PaymentDTO.Request request) {

        PaymentDTO.Response created = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ----------------------------------------------------------------
    // PUT /api/payments/{id}
    // ----------------------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<PaymentDTO.Response> updatePayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentDTO.Request request) {

        return ResponseEntity.ok(paymentService.updatePayment(id, request));
    }

    // ----------------------------------------------------------------
    // PATCH /api/payments/{id}/mark-paid
    //
    // Request body:
    //   { "paidDate": "2025-03-20", "paymentMethod": "CASH" }
    //
    // Quick action from payments table row — sets status to PAID
    // and updates tenant rentStatus automatically
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/mark-paid")
    public ResponseEntity<PaymentDTO.Response> markPaid(
            @PathVariable Long id,
            @Valid @RequestBody PaymentDTO.MarkPaidRequest request) {

        return ResponseEntity.ok(paymentService.markPaid(id, request));
    }

    // ----------------------------------------------------------------
    // DELETE /api/payments/{id}
    // ----------------------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }
}
