package com.yashwanth.ai_exam_system.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    private static final String SECRET_KEY = "super-secret-key-that-is-at-least-32-bytes-long-for-hs256!";
    private static final long ACCESS_EXPIRATION = 3600000L; // 1 hour in ms
    private static final long REFRESH_EXPIRATION = 604800000L; // 7 days in ms

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", SECRET_KEY);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", ACCESS_EXPIRATION);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", REFRESH_EXPIRATION);
    }

    @Test
    @DisplayName("generateAccessToken creates a valid access token with correct subject, role, and token type")
    void generateAccessToken_createsValidAccessToken() {
        String email = "test.user@example.com";
        String role = "STUDENT";

        String token = jwtService.generateAccessToken(email, role);

        assertThat(token).isNotNull().isNotEmpty();
        assertThat(jwtService.extractEmail(token)).isEqualTo(email);
        assertThat(jwtService.extractRole(token)).isEqualTo(role);
        assertThat(jwtService.extractTokenType(token)).isEqualTo("ACCESS");
        assertThat(jwtService.isTokenValid(token, email)).isTrue();
    }

    @Test
    @DisplayName("generateAccessToken token is invalid for mismatched email or invalid token string")
    void generateAccessToken_invalidForMismatchedEmailOrCorruptedToken() {
        String email = "test.user@example.com";
        String role = "TEACHER";

        String token = jwtService.generateAccessToken(email, role);

        assertThat(jwtService.isTokenValid(token, "other.user@example.com")).isFalse();
        assertThat(jwtService.isTokenValid("invalid.jwt.token", email)).isFalse();
    }

    @Test
    @DisplayName("generateRefreshToken creates a valid refresh token and is identified correctly")
    void generateRefreshToken_createsValidRefreshToken() {
        String email = "refresh.user@example.com";

        String token = jwtService.generateRefreshToken(email);

        assertThat(token).isNotNull().isNotEmpty();
        assertThat(jwtService.extractEmail(token)).isEqualTo(email);
        assertThat(jwtService.extractTokenType(token)).isEqualTo("REFRESH");
        assertThat(jwtService.isRefreshToken(token)).isTrue();
        // Refresh token should not be considered a valid access token by isTokenValid
        assertThat(jwtService.isTokenValid(token, email)).isFalse();
    }

    @Test
    @DisplayName("isRefreshToken returns false for access tokens or malformed tokens")
    void isRefreshToken_returnsFalseForAccessTokenAndMalformedToken() {
        String email = "user@example.com";
        String accessToken = jwtService.generateAccessToken(email, "ADMIN");

        assertThat(jwtService.isRefreshToken(accessToken)).isFalse();
        assertThat(jwtService.isRefreshToken("invalid.token")).isFalse();
    }

    @Test
    @DisplayName("getAccessTokenExpiry and getRefreshTokenExpiry return values in seconds")
    void getExpiryValues_returnSeconds() {
        assertThat(jwtService.getAccessTokenExpiry()).isEqualTo(3600L);
        assertThat(jwtService.getRefreshTokenExpiry()).isEqualTo(604800L);
    }

    @Test
    @DisplayName("getSignKey throws IllegalStateException when secret key is less than 32 bytes or null")
    void getSignKey_throwsExceptionWhenSecretKeyIsTooShortOrNull() {
        ReflectionTestUtils.setField(jwtService, "secretKey", "too-short");

        assertThatThrownBy(() -> jwtService.generateAccessToken("user@example.com", "STUDENT"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.jwt.secret must be at least 32 bytes");

        ReflectionTestUtils.setField(jwtService, "secretKey", null);

        assertThatThrownBy(() -> jwtService.generateAccessToken("user@example.com", "STUDENT"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.jwt.secret must be at least 32 bytes");
    }

    @Test
    @DisplayName("Expired token is invalid")
    void expiredToken_isInvalid() {
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", -1000L); // expired 1s ago

        String token = jwtService.generateAccessToken("expired@example.com", "STUDENT");

        assertThat(jwtService.isTokenValid(token, "expired@example.com")).isFalse();
    }
}
