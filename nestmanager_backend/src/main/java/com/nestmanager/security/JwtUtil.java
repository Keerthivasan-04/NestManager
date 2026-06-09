package com.nestmanager.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * JwtUtil — JWT token generation and validation
 *
 * Responsibilities:
 *  - Generate a JWT token on successful login
 *  - Extract username from a token
 *  - Extract role from a token
 *  - Validate a token (not expired, signature matches)
 *
 * The secret key and expiration are read from application.properties:
 *   nestmanager.jwt.secret=...
 *   nestmanager.jwt.expiration=86400000
 */
@Component
public class JwtUtil {

    @Value("${nestmanager.jwt.secret}")
    private String secretString;

    @Value("${nestmanager.jwt.expiration}")
    private long expiration;   // in milliseconds (default: 86400000 = 24 hours)

    // ----------------------------------------------------------------
    // Build the signing key from the secret string
    // ----------------------------------------------------------------
    private SecretKey getSigningKey() {
        byte[] keyBytes = secretString.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ----------------------------------------------------------------
    // Generate token
    // Called by AuthService after successful login
    //
    // Token payload (claims):
    //   sub  = username
    //   role = "ADMIN" | "MANAGER" | "STAFF"
    //   iat  = issued at (timestamp)
    //   exp  = expiration (timestamp)
    // ----------------------------------------------------------------

    /**
     * Generates a JWT token for the given user.
     * @param userDetails  Spring Security UserDetails (our User entity)
     * @param role         User's role as string (e.g. "ADMIN")
     * @return             Signed JWT token string
     */
    public String generateToken(UserDetails userDetails, String role) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", role);
        return buildToken(extraClaims, userDetails);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    // ----------------------------------------------------------------
    // Extract claims from token
    // ----------------------------------------------------------------

    /**
     * Extracts the username (subject) from the token.
     * Called by JwtFilter on every request.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the role from the token.
     * Stored as a custom claim when the token is generated.
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /**
     * Extracts the expiration date from the token.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Generic claim extractor — takes a function to pull any claim.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ----------------------------------------------------------------
    // Validate token
    // ----------------------------------------------------------------

    /**
     * Returns true if the token is valid:
     *  - Username matches the UserDetails
     *  - Token has not expired
     *
     * Called by JwtFilter before allowing the request through.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
