package com.yashwanth.ai_exam_system.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    // ================= CONFIG =================
    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.access-expiration}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    private static final String TOKEN_TYPE = "type";
    private static final String ROLE = "role";

    private static final String ACCESS = "ACCESS";
    private static final String REFRESH = "REFRESH";

    // ================= KEY =================
    private SecretKey getSignKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // ================= ACCESS TOKEN =================
    public String generateAccessToken(String email, String role) {

        Map<String, Object> claims = new HashMap<>();
        claims.put(ROLE, role);
        claims.put(TOKEN_TYPE, ACCESS);

        return buildToken(claims, email, accessTokenExpiration);
    }

    // ================= REFRESH TOKEN =================
    public String generateRefreshToken(String email) {

        Map<String, Object> claims = new HashMap<>();
        claims.put(TOKEN_TYPE, REFRESH);

        return buildToken(claims, email, refreshTokenExpiration);
    }

    // ================= TOKEN BUILDER =================
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

    // ================= EXTRACT EMAIL =================
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // ================= EXTRACT ROLE =================
    public String extractRole(String token) {
        return extractAllClaims(token).get(ROLE, String.class);
    }

    // ================= EXTRACT TOKEN TYPE =================
    public String extractTokenType(String token) {
        return extractAllClaims(token).get(TOKEN_TYPE, String.class);
    }

    // ================= GENERIC CLAIM =================
    public <T> T extractClaim(
            String token,
            Function<Claims, T> resolver) {

        final Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }

    // ================= PARSE CLAIMS =================
    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ================= TOKEN VALID =================
    public boolean isTokenValid(String token, String email) {

        try {
            final String username = extractEmail(token);

            return username.equals(email)
                    && !isTokenExpired(token)
                    && ACCESS.equals(extractTokenType(token));

        } catch (Exception e) {
            return false;
        }
    }

    // ================= REFRESH TOKEN CHECK =================
    public boolean isRefreshToken(String token) {

        try {
            return REFRESH.equals(extractTokenType(token))
                    && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    // ================= EXPIRY =================
    private boolean isTokenExpired(String token) {

        return extractClaim(token, Claims::getExpiration)
                .before(new Date());
    }

    // ================= EXPIRY GETTERS =================
    public long getAccessTokenExpiry() {
        return accessTokenExpiration / 1000;
    }

    public long getRefreshTokenExpiry() {
        return refreshTokenExpiration / 1000;
    }
}