package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class AuthResponse {

    private String accessToken;
    private String refreshToken;

    private String tokenType = "Bearer";

    private String role;
    private Long userId;
    private String name;
    private String email;

    private Long expiresIn;
    private LocalDateTime issuedAt;

    public AuthResponse() {
    }

    public AuthResponse(String accessToken,
                        String refreshToken,
                        String role,
                        Long userId,
                        String name,
                        String email,
                        Long expiresIn) {

        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.role = role;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.expiresIn = expiresIn;
        this.issuedAt = LocalDateTime.now();
    }

    // ================= GETTERS =================

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getRole() {
        return role;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public Long getExpiresIn() {
        return expiresIn;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    // ================= SETTERS =================

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setExpiresIn(Long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }
}