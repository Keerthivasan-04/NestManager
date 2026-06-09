package com.nestmanager.service;

import com.nestmanager.dto.AuthDTO;
import com.nestmanager.model.User;
import com.nestmanager.repository.UserRepository;
import com.nestmanager.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * AuthService — handles login and password management
 *
 * Responsibilities:
 *  - Authenticate user credentials via Spring Security
 *  - Generate JWT token on successful login
 *  - Change password (used by settings page)
 *  - Create default admin user on first startup
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtUtil               jwtUtil;

    // ----------------------------------------------------------------
    // LOGIN
    // Called by AuthController → POST /api/auth/login
    // ----------------------------------------------------------------

    /**
     * Authenticates the user and returns a JWT token.
     *
     * Steps:
     *  1. Pass username + password to Spring Security's AuthenticationManager
     *  2. AuthenticationManager calls UserDetailsService.loadUserByUsername()
     *  3. BCrypt verifies the password against the stored hash
     *  4. If valid → generate JWT token and return LoginResponse
     *  5. If invalid → BadCredentialsException is thrown → 401
     *
     * @param request  LoginRequest (username, password, role)
     * @return         LoginResponse (token, username, role)
     */
    public AuthDTO.LoginResponse login(AuthDTO.LoginRequest request) {

        // This triggers Spring Security's full auth flow
        // Throws BadCredentialsException if username/password is wrong
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // Get the authenticated User entity from the result
        User user = (User) authentication.getPrincipal();

        // Generate JWT token with username + role embedded
        String token = jwtUtil.generateToken(user, user.getRole().name());

        return AuthDTO.LoginResponse.from(user, token);
    }

    // ----------------------------------------------------------------
    // CHANGE PASSWORD
    // Called by SettingsController → PUT /api/settings/password
    // ----------------------------------------------------------------

    /**
     * Changes the password for the currently authenticated user.
     *
     * @param username        username of the logged-in user
     * @param request         ChangePasswordRequest (currentPassword, newPassword)
     */
    public void changePassword(String username, AuthDTO.ChangePasswordRequest request) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify current password matches what's stored
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        // Hash the new password and save
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // ----------------------------------------------------------------
    // CREATE DEFAULT ADMIN
    // Called on first startup if no users exist in the database
    // This is called from NestManagerApplication or a DataInitializer
    // ----------------------------------------------------------------

    /**
     * Creates a default admin user if the users table is empty.
     * Default credentials: admin / admin123
     * Change the password after first login via the Settings page.
     */
    public void createDefaultAdminIfNotExists() {
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .role(User.Role.ADMIN)
                    .fullName("Admin")
                    .build();
            userRepository.save(admin);
            System.out.println("========================================");
            System.out.println("  Default admin created: admin / admin123");
            System.out.println("  Please change your password after login.");
            System.out.println("========================================");
        }
    }
}
