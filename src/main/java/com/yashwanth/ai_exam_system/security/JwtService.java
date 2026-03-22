package com.yashwanth.ai_exam_system.security;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private static final String SECRET_KEY =
            "thisisaverysecuresecretkeythisisaverysecuresecretkeythisisaverysecuresecretkey";

    // 15 minutes
    private static final long ACCESS_TOKEN_EXPIRATION = 1000 * 60 * 15;

    // 7 days
    private static final long REFRESH_TOKEN_EXPIRATION = 1000L * 60 * 60 * 24 * 7;

    private SecretKey getSignKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    // =========================
    // ACCESS TOKEN
    // =========================
    public String generateAccessToken(String email, String role) {

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("type", "ACCESS");

        return buildToken(claims, email, ACCESS_TOKEN_EXPIRATION);
    }

    // =========================
    // REFRESH TOKEN
    // =========================
    public String generateRefreshToken(String email) {

        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "REFRESH");

        return buildToken(claims, email, REFRESH_TOKEN_EXPIRATION);
    }

    // =========================
    // COMMON TOKEN BUILDER
    // =========================
    private String buildToken(
            Map<String, Object> claims,
            String subject,
            long expiration) {

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignKey())
                .compact();
    }

    // =========================
    // EXTRACT EMAIL
    // =========================
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // =========================
    // EXTRACT ROLE
    // =========================
    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    // =========================
    // EXTRACT TOKEN TYPE
    // =========================
    public String extractTokenType(String token) {
        return extractAllClaims(token).get("type", String.class);
    }

    // =========================
    // GENERIC CLAIM EXTRACTOR
    // =========================
    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }

    // =========================
    // PARSE CLAIMS
    // =========================
    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // =========================
    // TOKEN VALIDATION
    // =========================
    public boolean isTokenValid(String token, String email) {

        final String username = extractEmail(token);

        return username.equals(email)
                && !isTokenExpired(token);
    }

    // =========================
    // REFRESH TOKEN VALIDATION
    // =========================
    public boolean isRefreshToken(String token) {
        return "REFRESH".equals(extractTokenType(token));
    }

    // =========================
    // CHECK EXPIRY
    // =========================
    private boolean isTokenExpired(String token) {

        return extractClaim(token, Claims::getExpiration)
                .before(new Date());
    }
}