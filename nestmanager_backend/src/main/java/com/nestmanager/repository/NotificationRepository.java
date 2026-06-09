package com.nestmanager.repository;

import com.nestmanager.model.Notification;
import com.nestmanager.model.Notification.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByOrderByCreatedAtDesc();

    // field is now isRead — Spring Data query method updated accordingly
    List<Notification> findByIsReadFalseOrderByCreatedAtDesc();

    long countByIsReadFalse();

    List<Notification> findByTypeOrderByCreatedAtDesc(NotificationType type);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.isRead = false")
    int markAllAsRead();

    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n")
    void deleteAllNotifications();
}