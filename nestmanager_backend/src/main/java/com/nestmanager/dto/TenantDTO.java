package com.nestmanager.dto;

import com.nestmanager.model.Tenant;
import com.nestmanager.model.Tenant.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * TenantDTO — request and response shapes for Tenant
 *
 * Contains two static nested classes:
 *  - Request       → what the frontend sends (POST / PUT)
 *  - Response      → what the backend returns (GET)
 *  - CheckoutRequest → what the frontend sends for checkout (PATCH)
 */
public class TenantDTO {

    // ----------------------------------------------------------------
    // TENANT REQUEST
    // Sent by tenants.js when adding or editing a tenant
    //
    // {
    //   "name": "Arjun Sharma",
    //   "phone": "+91 98765 43210",
    //   "email": "arjun@email.com",
    //   "gender": "MALE",
    //   "address": "12, Anna Nagar, Chennai",
    //   "idProofType": "AADHAAR",
    //   "idProofNumber": "1234 5678 9012",
    //   "roomNumber": "101",
    //   "checkInDate": "2025-01-10",
    //   "expectedCheckOut": null,
    //   "rentPerMonth": 5500,
    //   "securityDeposit": 11000,
    //   "emergencyContact": "Suresh - 98765 00001",
    //   "status": "ACTIVE"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {

        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        private String name;

        @NotBlank(message = "Phone is required")
        @Size(max = 20, message = "Phone must not exceed 20 characters")
        private String phone;

        @Email(message = "Enter a valid email address")
        @Size(max = 100)
        private String email;

        private Gender gender;

        private String address;

        @NotNull(message = "ID proof type is required")
        private IdProofType idProofType;

        @NotBlank(message = "ID proof number is required")
        @Size(max = 50, message = "ID number must not exceed 50 characters")
        private String idProofNumber;

        // Room number (not room ID) — frontend sends roomNumber directly
        private String roomNumber;

        @NotNull(message = "Check-in date is required")
        private LocalDate checkInDate;

        private LocalDate expectedCheckOut;

        @NotNull(message = "Monthly rent is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Rent must be greater than 0")
        private BigDecimal rentPerMonth;

        private BigDecimal securityDeposit;

        @Size(max = 150)
        private String emergencyContact;

        private TenantStatus status = TenantStatus.ACTIVE;
    }

    // ----------------------------------------------------------------
    // TENANT RESPONSE
    // Returned by TenantController for GET requests
    //
    // {
    //   "id": 1,
    //   "name": "Arjun Sharma",
    //   "phone": "+91 98765 43210",
    //   "email": "arjun@email.com",
    //   "gender": "MALE",
    //   "address": "12, Anna Nagar, Chennai",
    //   "idProofType": "AADHAAR",
    //   "idProofNumber": "1234 5678 9012",
    //   "roomNumber": "101",
    //   "checkInDate": "2025-01-10",
    //   "expectedCheckOut": null,
    //   "actualCheckOut": null,
    //   "rentPerMonth": 5500.00,
    //   "securityDeposit": 11000.00,
    //   "emergencyContact": "Suresh - 98765 00001",
    //   "status": "ACTIVE",
    //   "rentStatus": "PAID"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {

        private Long id;
        private String name;
        private String phone;
        private String email;
        private Gender gender;
        private String address;
        private IdProofType idProofType;
        private String idProofNumber;
        private String roomNumber;      // denormalized from room.roomNumber
        private LocalDate checkInDate;
        private LocalDate expectedCheckOut;
        private LocalDate actualCheckOut;
        private BigDecimal rentPerMonth;
        private BigDecimal securityDeposit;
        private String emergencyContact;
        private TenantStatus status;
        private RentStatus rentStatus;

        // Convenience factory — builds response from Tenant entity
        public static Response from(Tenant tenant) {
            return Response.builder()
                    .id(tenant.getId())
                    .name(tenant.getName())
                    .phone(tenant.getPhone())
                    .email(tenant.getEmail())
                    .gender(tenant.getGender())
                    .address(tenant.getAddress())
                    .idProofType(tenant.getIdProofType())
                    .idProofNumber(tenant.getIdProofNumber())
                    .roomNumber(tenant.getRoomNumber())   // uses helper method
                    .checkInDate(tenant.getCheckInDate())
                    .expectedCheckOut(tenant.getExpectedCheckOut())
                    .actualCheckOut(tenant.getActualCheckOut())
                    .rentPerMonth(tenant.getRentPerMonth())
                    .securityDeposit(tenant.getSecurityDeposit())
                    .emergencyContact(tenant.getEmergencyContact())
                    .status(tenant.getStatus())
                    .rentStatus(tenant.getRentStatus())
                    .build();
        }
    }

    // ----------------------------------------------------------------
    // CHECKOUT REQUEST
    // Sent by tenants.js when checking out a tenant
    // (PATCH /api/tenants/{id}/checkout)
    //
    // {
    //   "checkOutDate": "2025-03-20"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckoutRequest {

        @NotNull(message = "Check-out date is required")
        private LocalDate checkOutDate;
    }
}
