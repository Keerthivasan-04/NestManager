package com.nestmanager.service;

import com.nestmanager.model.Settings;
import com.nestmanager.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/**
 * SettingsService — manages property settings
 *
 * The settings table always has exactly one row (id = 1).
 * On first startup, a default Settings row is created automatically.
 *
 * Responsibilities:
 *  - Get current settings
 *  - Update property info, notification prefs, billing rules, security
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SettingsService {

    private final SettingsRepository settingsRepository;

    // ----------------------------------------------------------------
    // GET SETTINGS
    // GET /api/settings
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Settings getSettings() {
        return settingsRepository.findById(1L)
                .orElseGet(this::createDefaultSettings);
    }

    // ----------------------------------------------------------------
    // UPDATE PROPERTY INFO
    // PUT /api/settings/property
    // Body: { propertyName, ownerName, phone, email, gstin, address, city, pincode }
    // ----------------------------------------------------------------

    public Settings updateProperty(Map<String, String> body) {
        Settings settings = getSettings();
        if (body.containsKey("propertyName")) settings.setPropertyName(body.get("propertyName"));
        if (body.containsKey("ownerName"))    settings.setOwnerName(body.get("ownerName"));
        if (body.containsKey("phone"))        settings.setPhone(body.get("phone"));
        if (body.containsKey("email"))        settings.setEmail(body.get("email"));
        if (body.containsKey("gstin"))        settings.setGstin(body.get("gstin"));
        if (body.containsKey("address"))      settings.setAddress(body.get("address"));
        if (body.containsKey("city"))         settings.setCity(body.get("city"));
        if (body.containsKey("pincode"))      settings.setPincode(body.get("pincode"));
        return settingsRepository.save(settings);
    }

    // ----------------------------------------------------------------
    // UPDATE NOTIFICATION PREFERENCES
    // PUT /api/settings/notifications
    // Body: { rentReminders, overdueAlerts, checkoutAlerts, bookingAlerts,
    //         tenantAlerts, daysBefore, rentDueDay }
    // ----------------------------------------------------------------

    public Settings updateNotifications(Map<String, Object> body) {
        Settings settings = getSettings();
        if (body.containsKey("rentReminders"))  settings.setRentReminders((Boolean) body.get("rentReminders"));
        if (body.containsKey("overdueAlerts"))  settings.setOverdueAlerts((Boolean) body.get("overdueAlerts"));
        if (body.containsKey("checkoutAlerts")) settings.setCheckoutAlerts((Boolean) body.get("checkoutAlerts"));
        if (body.containsKey("bookingAlerts"))  settings.setBookingAlerts((Boolean) body.get("bookingAlerts"));
        if (body.containsKey("tenantAlerts"))   settings.setTenantAlerts((Boolean) body.get("tenantAlerts"));
        if (body.containsKey("daysBefore"))     settings.setDaysBefore((Integer) body.get("daysBefore"));
        if (body.containsKey("rentDueDay"))     settings.setRentDueDay((Integer) body.get("rentDueDay"));
        return settingsRepository.save(settings);
    }

    // ----------------------------------------------------------------
    // UPDATE BILLING RULES
    // PUT /api/settings/billing
    // Body: { lateFeePerDay, gracePeriodDays, depositMonths, currency, receiptFooter }
    // ----------------------------------------------------------------

    public Settings updateBilling(Map<String, Object> body) {
        Settings settings = getSettings();
        if (body.containsKey("lateFeePerDay"))   settings.setLateFeePerDay(
                new BigDecimal(body.get("lateFeePerDay").toString()));
        if (body.containsKey("gracePeriodDays")) settings.setGracePeriodDays(
                (Integer) body.get("gracePeriodDays"));
        if (body.containsKey("depositMonths"))   settings.setDepositMonths(
                (Integer) body.get("depositMonths"));
        if (body.containsKey("currency"))        settings.setCurrency(
                (String) body.get("currency"));
        if (body.containsKey("receiptFooter"))   settings.setReceiptFooter(
                (String) body.get("receiptFooter"));
        return settingsRepository.save(settings);
    }

    // ----------------------------------------------------------------
    // UPDATE SECURITY SETTINGS
    // PUT /api/settings/security
    // Body: { autoLogout, loginLimit, sessionTimeoutMinutes }
    // ----------------------------------------------------------------

    public Settings updateSecurity(Map<String, Object> body) {
        Settings settings = getSettings();
        if (body.containsKey("autoLogout"))             settings.setAutoLogout(
                (Boolean) body.get("autoLogout"));
        if (body.containsKey("loginLimit"))             settings.setLoginLimit(
                (Boolean) body.get("loginLimit"));
        if (body.containsKey("sessionTimeoutMinutes"))  settings.setSessionTimeoutMinutes(
                (Integer) body.get("sessionTimeoutMinutes"));
        return settingsRepository.save(settings);
    }

    // ----------------------------------------------------------------
    // CREATE DEFAULT SETTINGS
    // Called on first startup if no settings row exists
    // ----------------------------------------------------------------

    private Settings createDefaultSettings() {
        Settings defaults = Settings.builder()
                .id(1L)
                .propertyName("My Property")
                .ownerName("Admin")
                .phone("")
                .rentDueDay(5)
                .daysBefore(3)
                .gracePeriodDays(5)
                .depositMonths(2)
                .currency("INR")
                .receiptFooter("Thank you for your payment.")
                .rentReminders(true)
                .overdueAlerts(true)
                .checkoutAlerts(true)
                .bookingAlerts(true)
                .tenantAlerts(true)
                .autoLogout(true)
                .loginLimit(true)
                .sessionTimeoutMinutes(30)
                .build();
        return settingsRepository.save(defaults);
    }
}
