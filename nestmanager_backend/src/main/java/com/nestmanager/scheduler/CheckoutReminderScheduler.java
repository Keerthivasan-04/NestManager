package com.nestmanager.scheduler;

import com.nestmanager.model.Notification.NotificationType;
import com.nestmanager.model.Tenant;
import com.nestmanager.model.Booking;
import com.nestmanager.repository.BookingRepository;
import com.nestmanager.repository.TenantRepository;
import com.nestmanager.service.NotificationService;
import com.nestmanager.service.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * CheckoutReminderScheduler
 *
 * Runs every day at 9:00 AM.
 *
 * Two jobs:
 *
 * Job 1 — Tenant checkout reminders
 *   Finds active tenants whose expectedCheckOut date falls
 *   within the next 3 days and creates a CHECKOUT notification.
 *
 * Job 2 — Booking checkout reminders
 *   Finds CHECKED_IN bookings whose checkOutDate falls
 *   within the next 3 days and creates a CHECKOUT notification.
 *
 * Both jobs read settings.checkoutAlerts to decide whether to run.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CheckoutReminderScheduler {

    private final TenantRepository    tenantRepository;
    private final BookingRepository   bookingRepository;
    private final NotificationService notificationService;
    private final SettingsService     settingsService;

    // ----------------------------------------------------------------
    // HOW MANY DAYS AHEAD TO SEND THE CHECKOUT REMINDER
    // ----------------------------------------------------------------
    private static final int DAYS_AHEAD = 3;

    // ----------------------------------------------------------------
    // JOB 1 — TENANT CHECKOUT REMINDERS
    // Runs every day at 9:05 AM (5 min after rent scheduler)
    // ----------------------------------------------------------------

    @Scheduled(cron = "0 5 9 * * *")
    @Transactional(readOnly = true)
    public void sendTenantCheckoutReminders() {

        // Skip if checkout alerts are disabled in settings
        if (!settingsService.getSettings().getCheckoutAlerts()) {
            log.info("[Scheduler] Checkout alerts disabled — skipping tenants.");
            return;
        }

        LocalDate today      = LocalDate.now();
        LocalDate futureDate = today.plusDays(DAYS_AHEAD);

        // Find tenants with upcoming checkout
        List<Tenant> upcoming = tenantRepository
                .findTenantsWithUpcomingCheckout(today, futureDate);

        if (upcoming.isEmpty()) {
            log.info("[Scheduler] No upcoming tenant checkouts in next {} days.", DAYS_AHEAD);
            return;
        }

        log.info("[Scheduler] {} tenant checkout reminder(s) to send.", upcoming.size());

        for (Tenant tenant : upcoming) {

            LocalDate checkoutDate = tenant.getExpectedCheckOut();
            long daysUntil = ChronoUnit.DAYS.between(today, checkoutDate);

            String title   = "Check-out scheduled — " + tenant.getName();
            String message = tenant.getName()
                    + " (Room " + tenant.getRoomNumber() + ") is scheduled to "
                    + "check out on " + checkoutDate
                    + (daysUntil == 0
                        ? " — today!"
                        : " — in " + daysUntil + " day(s).")
                    + " Please prepare the room for the next tenant.";

            notificationService.createNotification(
                    NotificationType.CHECKOUT, title, message);

            log.info("[Scheduler] Checkout reminder created for {} — {}",
                    tenant.getName(), checkoutDate);
        }
    }

    // ----------------------------------------------------------------
    // JOB 2 — BOOKING CHECKOUT REMINDERS
    // Runs every day at 9:05 AM
    // ----------------------------------------------------------------

    @Scheduled(cron = "0 5 9 * * *")
    @Transactional(readOnly = true)
    public void sendBookingCheckoutReminders() {

        // Skip if checkout alerts are disabled
        if (!settingsService.getSettings().getCheckoutAlerts()) {
            log.info("[Scheduler] Checkout alerts disabled — skipping bookings.");
            return;
        }

        LocalDate today      = LocalDate.now();
        LocalDate futureDate = today.plusDays(DAYS_AHEAD);

        // Find CHECKED_IN bookings with upcoming checkout dates
        List<Booking> upcoming = bookingRepository
                .findBookingsWithUpcomingCheckout(today, futureDate);

        if (upcoming.isEmpty()) {
            log.info("[Scheduler] No upcoming booking checkouts in next {} days.", DAYS_AHEAD);
            return;
        }

        log.info("[Scheduler] {} booking checkout reminder(s) to send.", upcoming.size());

        for (Booking booking : upcoming) {

            LocalDate checkoutDate = booking.getCheckOutDate();
            long daysUntil = ChronoUnit.DAYS.between(today, checkoutDate);

            String title   = "Guest check-out — " + booking.getGuestName();
            String message = "Booking " + booking.getBookingCode()
                    + " — " + booking.getGuestName()
                    + " (Room " + booking.getRoomNumber() + ") is checking out on "
                    + checkoutDate
                    + (daysUntil == 0
                        ? " — today!"
                        : " — in " + daysUntil + " day(s).")
                    + " Please arrange room cleaning.";

            notificationService.createNotification(
                    NotificationType.CHECKOUT, title, message);

            log.info("[Scheduler] Booking checkout reminder for {} — {}",
                    booking.getGuestName(), checkoutDate);
        }
    }
}
