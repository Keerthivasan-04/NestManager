package com.nestmanager.service;

import com.nestmanager.exception.ResourceNotFoundException;
import com.nestmanager.model.Notification;
import com.nestmanager.model.Notification.NotificationType;
import com.nestmanager.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NotificationService — manages system notifications
 *
 * Responsibilities:
 *  - Fetch all notifications (for notifications page)
 *  - Mark one or all as read
 *  - Delete one or all
 *  - Create notifications (called by schedulers and other services)
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ----------------------------------------------------------------
    // GET ALL NOTIFICATIONS
    // GET /api/notifications
    // Returns list with isToday and timeAgo computed fields
    // ----------------------------------------------------------------

    public List<Map<String, Object>> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getNotificationsByType(NotificationType type) {
        return notificationRepository.findByTypeOrderByCreatedAtDesc(type)
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------------------
    // MARK ONE AS READ
    // PATCH /api/notifications/{id}/read
    // ----------------------------------------------------------------

    public void markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + id
                ));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    // ----------------------------------------------------------------
    // MARK ALL AS READ
    // PATCH /api/notifications/read-all
    // ----------------------------------------------------------------

    public void markAllAsRead() {
        notificationRepository.markAllAsRead();
    }

    // ----------------------------------------------------------------
    // DELETE ONE
    // DELETE /api/notifications/{id}
    // ----------------------------------------------------------------

    public void deleteNotification(Long id) {
        if (!notificationRepository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Notification not found with id: " + id
            );
        }
        notificationRepository.deleteById(id);
    }

    // ----------------------------------------------------------------
    // CLEAR ALL
    // DELETE /api/notifications
    // ----------------------------------------------------------------

    public void clearAll() {
        notificationRepository.deleteAllNotifications();
    }

    // ----------------------------------------------------------------
    // UNREAD COUNT
    // Used by DashboardService for nav badge
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return notificationRepository.countByIsReadFalse();
    }

    // ----------------------------------------------------------------
    // CREATE NOTIFICATION
    // Called internally by schedulers and other services
    // ----------------------------------------------------------------

    /**
     * Creates a new notification.
     * Called by:
     *  - RentReminderScheduler  → type = RENT
     *  - CheckoutReminderScheduler → type = CHECKOUT
     *  - BookingService on new booking → type = BOOKING
     *
     * @param type    notification type
     * @param title   short title (shown in bold)
     * @param message detailed message
     */
    public void createNotification(NotificationType type,
                                   String title,
                                   String message) {
        Notification notification = Notification.builder()
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    // ----------------------------------------------------------------
    // MAP ENTITY TO RESPONSE
    // Converts Notification entity to Map so the
    // computed helpers (isToday, timeAgo) are included in JSON
    // ----------------------------------------------------------------

    private Map<String, Object> toMap(Notification n) {
        return Map.of(
                "id",        n.getId(),
                "type",      n.getType().name(),
                "title",     n.getTitle(),
                "message",   n.getMessage(),
                "read",      n.getIsRead(),
                "isToday",   n.isToday(),
                "time",      n.getTimeAgo(),
                "createdAt", n.getCreatedAt().toString()
        );
    }
}