package com.nestmanager.controller;

import com.nestmanager.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * NotificationController — REST endpoints for notifications
 *
 * Endpoints:
 *  GET    /api/notifications              → all notifications
 *  PATCH  /api/notifications/{id}/read    → mark one as read
 *  PATCH  /api/notifications/read-all     → mark all as read
 *  DELETE /api/notifications/{id}         → delete one
 *  DELETE /api/notifications              → clear all
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // ----------------------------------------------------------------
    // GET /api/notifications
    // Returns all notifications ordered by newest first
    // Each item includes computed fields: isToday, time (timeAgo)
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    // ----------------------------------------------------------------
    // PATCH /api/notifications/{id}/read
    // Marks a single notification as read
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    // ----------------------------------------------------------------
    // PATCH /api/notifications/read-all
    // Marks ALL notifications as read in one query
    // Called by "Mark All Read" button on notifications page
    // ----------------------------------------------------------------
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // ----------------------------------------------------------------
    // DELETE /api/notifications/{id}
    // Deletes one notification (dismiss button)
    // ----------------------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    // ----------------------------------------------------------------
    // DELETE /api/notifications
    // Clears ALL notifications (Clear All button)
    // ----------------------------------------------------------------
    @DeleteMapping
    public ResponseEntity<Map<String, String>> clearAll() {
        notificationService.clearAll();
        return ResponseEntity.ok(Map.of("message", "All notifications cleared"));
    }
}
