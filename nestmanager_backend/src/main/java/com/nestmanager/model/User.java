package com.nestmanager.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * User — system user (Admin / Manager / Staff)
 *
 * Implements Spring Security's UserDetails so this entity can be
 * used directly in the authentication process without a separate
 * wrapper class.
 *
 * Table: users
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ----------------------------------------------------------------
    // Login credentials
    // ----------------------------------------------------------------

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    // Stored as BCrypt hash — never plain text
    @Column(nullable = false)
    private String password;

    // ----------------------------------------------------------------
    // Role — controls what the user can access
    // ----------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    // ----------------------------------------------------------------
    // Profile
    // ----------------------------------------------------------------

    @Column(length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    // ----------------------------------------------------------------
    // Timestamps
    // ----------------------------------------------------------------

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ----------------------------------------------------------------
    // UserDetails implementation (required by Spring Security)
    // ----------------------------------------------------------------

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Role becomes "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF"
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired()    { return true; }

    @Override
    public boolean isAccountNonLocked()     { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled()              { return true; }

    // ----------------------------------------------------------------
    // Role enum
    // ----------------------------------------------------------------

    public enum Role {
        ADMIN,      // Owner — full access
        MANAGER,    // Can manage rooms, tenants, bookings, payments
        STAFF       // Read-only + limited actions
    }
}
