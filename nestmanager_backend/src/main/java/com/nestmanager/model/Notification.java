package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // "read" is a reserved keyword in MySQL — renamed to isRead, column = is_read
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public boolean isToday() {
        return createdAt != null &&
                createdAt.toLocalDate().equals(java.time.LocalDate.now());
    }

    public String getTimeAgo() {
        if (createdAt == null) return "";
        long minutes = java.time.Duration.between(createdAt, LocalDateTime.now()).toMinutes();
        if (minutes < 1)  return "Just now";
        if (minutes < 60) return minutes + " min ago";
        long hours = minutes / 60;
        if (hours < 24)   return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
        long days = hours / 24;
        if (days == 1)    return "1 day ago";
        if (days < 7)     return days + " days ago";
        return createdAt.toLocalDate().toString();
    }

    public enum NotificationType {
        RENT,
        CHECKOUT,
        BOOKING,
        SYSTEM
    }
}