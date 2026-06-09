package com.nestmanager.dto;

import com.nestmanager.model.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * AuthDTO — request and response shapes for authentication
 *
 * Contains two static nested classes:
 *  - LoginRequest  → what the frontend sends  (POST /api/auth/login)
 *  - LoginResponse → what the backend returns (token + user info)
 */
public class AuthDTO {

    // ----------------------------------------------------------------
    // LOGIN REQUEST
    // Sent by login.js as JSON body
    //
    // {
    //   "username": "admin",
    //   "password": "admin123",
    //   "role": "ADMIN"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        // Role is optional — defaults to ADMIN if not sent
        private String role;
    }

    // ----------------------------------------------------------------
    // LOGIN RESPONSE
    // Returned by AuthController on successful login
    //
    // {
    //   "token": "eyJhbGciOiJIUzI1NiJ9...",
    //   "username": "admin",
    //   "role": "ADMIN"
    // }
    //
    // Frontend stores this token in sessionStorage/localStorage
    // and sends it as "Authorization: Bearer {token}" on every request
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {

        private String token;
        private String username;
        private String role;
        private String fullName;

        // Convenience factory — builds response from User entity + token
        public static LoginResponse from(User user, String token) {
            return LoginResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .fullName(user.getFullName())
                    .build();
        }
    }

    // ----------------------------------------------------------------
    // CHANGE PASSWORD REQUEST
    // Sent by settings.js (PUT /api/settings/password)
    //
    // {
    //   "currentPassword": "old123",
    //   "newPassword": "new456"
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangePasswordRequest {

        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;
    }
}
