package com.nestmanager.controller;

import com.nestmanager.dto.AuthDTO;
import com.nestmanager.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — handles login and logout
 *
 * Endpoints:
 *  POST /api/auth/login   → returns JWT token
 *  POST /api/auth/logout  → client-side logout (token invalidation)
 *
 * Both endpoints are public (no JWT required) — configured in SecurityConfig.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ----------------------------------------------------------------
    // POST /api/auth/login
    //
    // Request body:
    //   { "username": "admin", "password": "admin123", "role": "ADMIN" }
    //
    // Response 200:
    //   { "token": "eyJ...", "username": "admin", "role": "ADMIN" }
    //
    // Response 401:
    //   { "message": "Bad credentials" }
    // ----------------------------------------------------------------
    @PostMapping("/login")
    public ResponseEntity<AuthDTO.LoginResponse> login(
            @Valid @RequestBody AuthDTO.LoginRequest request) {

        AuthDTO.LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // ----------------------------------------------------------------
    // POST /api/auth/logout
    //
    // JWT is stateless — there is no server-side session to destroy.
    // The frontend clears the token from localStorage/sessionStorage.
    // This endpoint exists so the frontend can call it consistently.
    //
    // Response 200: { "message": "Logged out successfully" }
    // ----------------------------------------------------------------
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok().body(
                java.util.Map.of("message", "Logged out successfully")
        );
    }
}
