package com.nestmanager.repository;

import com.nestmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UserRepository
 *
 * Used by:
 *  - AuthService      → findByUsername() for login validation
 *  - UserDetailsServiceImpl → findByUsername() for Spring Security
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by username — used during login
    Optional<User> findByUsername(String username);

    // Check if a username already exists — used during registration
    boolean existsByUsername(String username);

    // Check if an email already exists
    boolean existsByEmail(String email);
}
