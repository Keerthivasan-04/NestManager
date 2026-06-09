package com.nestmanager.repository;

import com.nestmanager.model.Settings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * SettingsRepository
 *
 * Simple repository for the single-row settings table.
 * JpaRepository provides findById(1L), save(), existsById() out of the box.
 *
 * Used by:
 *  - SettingsService  → get and update settings
 *  - RentReminderScheduler → read rentDueDay and daysBefore
 */
@Repository
public interface SettingsRepository extends JpaRepository<Settings, Long> {
    // No custom methods needed — findById(1L) covers everything
}
