package com.nestmanager.scheduler;

import com.nestmanager.model.Notification.NotificationType;
import com.nestmanager.model.Payment;
import com.nestmanager.model.Payment.PaymentStatus;
import com.nestmanager.model.Settings;
import com.nestmanager.model.Tenant;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.repository.PaymentRepository;
import com.nestmanager.repository.TenantRepository;
import com.nestmanager.service.NotificationService;
import com.nestmanager.service.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * RentReminderScheduler
 *
 * Runs every day at 9:00 AM (configurable via cron expression).
 *
 * Two jobs:
 *
 * Job 1 — Mark overdue payments
 *   Finds all PENDING payments whose due date has passed
 *   and marks them as OVERDUE. Also updates the tenant's rentStatus.
 *
 * Job 2 — Send rent due reminders
 *   Finds all active tenants whose rent is due within the next
 *   N days (N = settings.daysBefore, default = 3).
 *   Creates a RENT notification for each one.
 *
 * Both jobs read configuration from the Settings table:
 *   - settings.rentDueDay     → day of month rent is due (default: 5)
 *   - settings.daysBefore     → days before due date to send reminder (default: 3)
 *   - settings.rentReminders  → toggle reminders on/off
 *   - settings.overdueAlerts  → toggle overdue alerts on/off
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RentReminderScheduler {

    private final TenantRepository     tenantRepository;
    private final PaymentRepository    paymentRepository;
    private final NotificationService  notificationService;
    private final SettingsService      settingsService;

    // ----------------------------------------------------------------
    // JOB 1 — MARK OVERDUE PAYMENTS
    // Runs every day at 9:00 AM
    // cron = "second minute hour day month weekday"
    // ----------------------------------------------------------------

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void markOverduePayments() {

        Settings settings = settingsService.getSettings();

        // Skip if overdue alerts are disabled
        if (!settings.getOverdueAlerts()) {
            log.info("[Scheduler] Overdue alerts disabled — skipping.");
            return;
        }

        LocalDate today = LocalDate.now();

        // Find all PENDING payments whose due date has passed
        List<Payment> overduePayments = paymentRepository.findOverduePayments(today);

        if (overduePayments.isEmpty()) {
            log.info("[Scheduler] No overdue payments found.");
            return;
        }

        log.info("[Scheduler] Marking {} payment(s) as OVERDUE.", overduePayments.size());

        for (Payment payment : overduePayments) {

            // Mark payment as overdue
            payment.setStatus(PaymentStatus.OVERDUE);
            paymentRepository.save(payment);

            // Update tenant's rentStatus to OVERDUE
            if (payment.getTenant() != null) {
                Tenant tenant = payment.getTenant();
                tenant.setRentStatus(Tenant.RentStatus.OVERDUE);
                tenantRepository.save(tenant);

                // Create overdue notification
                String title   = "Rent overdue — " + tenant.getName();
                String message = "Room " + payment.getRoomNumber()
                        + " rent of ₹" + payment.getAmount()
                        + " is overdue since " + payment.getDueDate()
                        + ". Please follow up.";

                notificationService.createNotification(
                        NotificationType.RENT, title, message);

                log.info("[Scheduler] Marked OVERDUE: {} — Room {}",
                        tenant.getName(), payment.getRoomNumber());
            }
        }
    }

    // ----------------------------------------------------------------
    // JOB 2 — SEND RENT DUE REMINDERS
    // Runs every day at 9:00 AM
    // ----------------------------------------------------------------

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendRentDueReminders() {

        Settings settings = settingsService.getSettings();

        // Skip if rent reminders are disabled
        if (!settings.getRentReminders()) {
            log.info("[Scheduler] Rent reminders disabled — skipping.");
            return;
        }

        LocalDate today      = LocalDate.now();
        int rentDueDay       = settings.getRentDueDay();       // e.g. 5
        int daysBefore       = settings.getDaysBefore();       // e.g. 3

        // Build the due date for this month
        // e.g. if today = March 2, rentDueDay = 5 → dueDate = March 5
        YearMonth currentMonth = YearMonth.now();
        LocalDate dueDate;

        try {
            dueDate = currentMonth.atDay(rentDueDay);
        } catch (Exception e) {
            // Safety: if rentDueDay = 31 and month has 30 days, use last day
            dueDate = currentMonth.atEndOfMonth();
        }

        // Check if today is within the reminder window
        // e.g. daysBefore = 3, dueDate = March 5
        //      reminder window = March 2, March 3, March 4
        LocalDate reminderStart = dueDate.minusDays(daysBefore);

        if (today.isBefore(reminderStart) || today.isAfter(dueDate)) {
            log.info("[Scheduler] Outside reminder window ({} to {}). Skipping.",
                    reminderStart, dueDate);
            return;
        }

        // Get all active tenants
        List<Tenant> activeTenants = tenantRepository
                .findByStatus(TenantStatus.ACTIVE);

        if (activeTenants.isEmpty()) {
            log.info("[Scheduler] No active tenants found.");
            return;
        }

        // Format forMonth string for checking existing payments
        String forMonth = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        long daysUntilDue = java.time.temporal.ChronoUnit.DAYS.between(today, dueDate);

        log.info("[Scheduler] Sending rent reminders to {} tenants. Due in {} day(s).",
                activeTenants.size(), daysUntilDue);

        for (Tenant tenant : activeTenants) {

            // Skip tenants who have already paid this month
            boolean alreadyPaid = paymentRepository
                    .findByTenantId(tenant.getId())
                    .stream()
                    .anyMatch(p -> p.getForMonth().equals(forMonth)
                               && p.getStatus() == PaymentStatus.PAID);

            if (alreadyPaid) {
                log.debug("[Scheduler] {} already paid for {}. Skipping.",
                        tenant.getName(), forMonth);
                continue;
            }

            // Create rent due reminder notification
            String title   = "Rent due " + (daysUntilDue == 0
                    ? "today" : "in " + daysUntilDue + " day(s)")
                    + " — " + tenant.getName();

            String message = "Room " + tenant.getRoomNumber()
                    + " rent of ₹" + tenant.getRentPerMonth()
                    + " is due on " + dueDate
                    + ". " + (daysUntilDue == 0
                        ? "Please collect today."
                        : "Reminder sent " + daysBefore + " days in advance.");

            notificationService.createNotification(
                    NotificationType.RENT, title, message);

            log.info("[Scheduler] Rent reminder created for {} — Room {}",
                    tenant.getName(), tenant.getRoomNumber());
        }
    }
}
