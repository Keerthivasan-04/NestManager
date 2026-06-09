package com.nestmanager.controller;

import com.nestmanager.dto.AuthDTO;
import com.nestmanager.model.Settings;
import com.nestmanager.service.AuthService;
import com.nestmanager.service.SettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SettingsController — REST endpoints for the settings page
 *
 * Endpoints:
 *  GET  /api/settings                  → get all settings
 *  PUT  /api/settings/property         → update property info
 *  PUT  /api/settings/notifications    → update notification preferences
 *  PUT  /api/settings/billing          → update billing rules
 *  PUT  /api/settings/security         → update security settings
 *  PUT  /api/settings/password         → change password
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;
    private final AuthService     authService;

    // ----------------------------------------------------------------
    // GET /api/settings
    // Returns full settings object for all settings page tabs
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<Settings> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    // ----------------------------------------------------------------
    // PUT /api/settings/property
    //
    // Body: { "propertyName": "...", "ownerName": "...", "phone": "...",
    //         "email": "...", "gstin": "...", "address": "...",
    //         "city": "...", "pincode": "..." }
    // ----------------------------------------------------------------
    @PutMapping("/property")
    public ResponseEntity<Settings> updateProperty(
            @RequestBody Map<String, String> body) {

        return ResponseEntity.ok(settingsService.updateProperty(body));
    }

    // ----------------------------------------------------------------
    // PUT /api/settings/notifications
    //
    // Body: { "rentReminders": true, "overdueAlerts": true,
    //         "checkoutAlerts": true, "bookingAlerts": true,
    //         "tenantAlerts": true, "daysBefore": 3, "rentDueDay": 5 }
    // ----------------------------------------------------------------
    @PutMapping("/notifications")
    public ResponseEntity<Settings> updateNotifications(
            @RequestBody Map<String, Object> body) {

        return ResponseEntity.ok(settingsService.updateNotifications(body));
    }

    // ----------------------------------------------------------------
    // PUT /api/settings/billing
    //
    // Body: { "lateFeePerDay": 50, "gracePeriodDays": 5,
    //         "depositMonths": 2, "currency": "INR",
    //         "receiptFooter": "Thank you for your payment." }
    // ----------------------------------------------------------------
    @PutMapping("/billing")
    public ResponseEntity<Settings> updateBilling(
            @RequestBody Map<String, Object> body) {

        return ResponseEntity.ok(settingsService.updateBilling(body));
    }

    // ----------------------------------------------------------------
    // PUT /api/settings/security
    //
    // Body: { "autoLogout": true, "loginLimit": true,
    //         "sessionTimeoutMinutes": 30 }
    // ----------------------------------------------------------------
    @PutMapping("/security")
    public ResponseEntity<Settings> updateSecurity(
            @RequestBody Map<String, Object> body) {

        return ResponseEntity.ok(settingsService.updateSecurity(body));
    }

    // ----------------------------------------------------------------
    // PUT /api/settings/password
    //
    // Body: { "currentPassword": "old123", "newPassword": "new456" }
    //
    // @AuthenticationPrincipal extracts the logged-in user from the JWT
    // so we know whose password to change
    // ----------------------------------------------------------------
    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AuthDTO.ChangePasswordRequest request) {

        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
