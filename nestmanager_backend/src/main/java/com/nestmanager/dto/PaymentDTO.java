package com.nestmanager.dto;

import com.nestmanager.model.Payment;
import com.nestmanager.model.Payment.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * PaymentDTO — request and response shapes for Payment
 *
 * Contains:
 *  - Request       → what the frontend sends (POST / PUT)
 *  - Response      → what the backend returns (GET)
 *  - MarkPaidRequest → what the frontend sends for mark-paid (PATCH)
 */
public class PaymentDTO {

    // ----------------------------------------------------------------
    // PAYMENT REQUEST
    // Sent by payments.js when recording or editing a payment
    //
    // {
    //   "tenantId": 1,
    //   "roomNumber": "101",
    //   "amount": 5500,
    //   "paymentMethod": "UPI",
    //   "forMonth": "2025-03",
    //   "paidDate": "2025-03-03",
    //   "dueDate": "2025-03-05",
    //   "status": "PAID",
    //   "transactionId": "UPI25030001",
    //   "notes": null
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {

        @NotNull(message = "Tenant is required")
        private Long tenantId;

        private String roomNumber;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
        private BigDecimal amount;

        private PaymentMethod paymentMethod;

        @NotBlank(message = "Payment month is required")
        @Pattern(regexp = "\\d{4}-\\d{2}", message = "forMonth must be in YYYY-MM format")
        private String forMonth;

        private LocalDate paidDate;

        private LocalDate dueDate;

        private PaymentStatus status = PaymentStatus.PENDING;

        @Size(max = 100, message = "Transaction ID must not exceed 100 characters")
        private String transactionId;

        private String notes;
    }

    // ----------------------------------------------------------------
    // PAYMENT RESPONSE
    // Returned by PaymentController for GET requests
    //
    // {
    //   "id": 1,
    //   "receiptNumber": "REC-001",
    //   "tenantId": 1,
    //   "tenantName": "Arjun Sharma",
    //   "tenantPhone": "+91 98765 43210",
    //   "roomNumber": "101",
    //   "forMonth": "2025-03",
    //   "amount": 5500.00,
    //   "paymentMethod": "UPI",
    //   "transactionId": "UPI25030001",
    //   "dueDate": "2025-03-05",
    //   "paidDate": "2025-03-03",
    //   "status": "PAID",
    //   "notes": null,
    //   "createdAt": "2025-03-03T10:00:00"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {

        private Long id;
        private String receiptNumber;
        private Long tenantId;
        private String tenantName;      // denormalized — tenant.name
        private String tenantPhone;     // denormalized — tenant.phone
        private String roomNumber;      // denormalized — stored in payment row
        private String forMonth;
        private BigDecimal amount;
        private PaymentMethod paymentMethod;
        private String transactionId;
        private LocalDate dueDate;
        private LocalDate paidDate;
        private PaymentStatus status;
        private String notes;
        private LocalDateTime createdAt;

        // Convenience factory — builds response from Payment entity
        public static Response from(Payment payment) {
            return Response.builder()
                    .id(payment.getId())
                    .receiptNumber(payment.getReceiptNumber())
                    .tenantId(payment.getTenantId())         // uses helper method
                    .tenantName(payment.getTenantName())     // uses helper method
                    .tenantPhone(payment.getTenantPhone())   // uses helper method
                    .roomNumber(payment.getRoomNumber())
                    .forMonth(payment.getForMonth())
                    .amount(payment.getAmount())
                    .paymentMethod(payment.getPaymentMethod())
                    .transactionId(payment.getTransactionId())
                    .dueDate(payment.getDueDate())
                    .paidDate(payment.getPaidDate())
                    .status(payment.getStatus())
                    .notes(payment.getNotes())
                    .createdAt(payment.getCreatedAt())
                    .build();
        }
    }

    // ----------------------------------------------------------------
    // MARK PAID REQUEST
    // Sent by payments.js when clicking "Mark Paid" on a payment row
    // (PATCH /api/payments/{id}/mark-paid)
    //
    // {
    //   "paidDate": "2025-03-20",
    //   "paymentMethod": "CASH"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkPaidRequest {

        @NotNull(message = "Paid date is required")
        private LocalDate paidDate;

        @NotNull(message = "Payment method is required")
        private PaymentMethod paymentMethod;

        @Size(max = 100)
        private String transactionId;
    }
}
