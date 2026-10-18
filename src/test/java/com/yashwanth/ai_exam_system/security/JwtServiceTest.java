package com.yashwanth.ai_exam_system.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    private final String testSecret = "12345678901234567890123456789012345678901234567890";
    private final long accessExpirationMs = 3600000L;  // 1 hour
    private final long refreshExpirationMs = 86400000L; // 24 hours

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", testSecret);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", accessExpirationMs);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", refreshExpirationMs);
    }

    @Test
    @DisplayName("extractEmail should parse and return subject email from valid access token")
    void extractEmail_WithValidAccessToken_ReturnsEmail() {
        String email = "student@ai-exam.local";
        String token = jwtService.generateAccessToken(email, "STUDENT");

        String extractedEmail = jwtService.extractEmail(token);

        assertThat(extractedEmail).isEqualTo(email);
    }

    @Test
    @DisplayName("extractEmail should parse and return subject email from valid refresh token")
    void extractEmail_WithValidRefreshToken_ReturnsEmail() {
        String email = "teacher@ai-exam.local";
        String token = jwtService.generateRefreshToken(email);

        String extractedEmail = jwtService.extractEmail(token);

        assertThat(extractedEmail).isEqualTo(email);
    }

    @Test
    @DisplayName("extractEmail should throw JwtException when token is malformed or invalid")
    void extractEmail_WithMalformedToken_ThrowsException() {
        String invalidToken = "invalid.token.str";

        assertThatThrownBy(() -> jwtService.extractEmail(invalidToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("extractEmail should throw Exception when token is empty or null")
    void extractEmail_WithEmptyOrNullToken_ThrowsException() {
        assertThatThrownBy(() -> jwtService.extractEmail(""))
                .isInstanceOf(Exception.class);

        assertThatThrownBy(() -> jwtService.extractEmail(null))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("extractRole should return role claim from access token")
    void extractRole_WithValidAccessToken_ReturnsRole() {
        String token = jwtService.generateAccessToken("admin@ai-exam.local", "ADMIN");

        String role = jwtService.extractRole(token);

        assertThat(role).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("extractTokenType should return ACCESS or REFRESH according to token type")
    void extractTokenType_ReturnsCorrectType() {
        String accessToken = jwtService.generateAccessToken("user@ai-exam.local", "STUDENT");
        String refreshToken = jwtService.generateRefreshToken("user@ai-exam.local");

        assertThat(jwtService.extractTokenType(accessToken)).isEqualTo("ACCESS");
        assertThat(jwtService.extractTokenType(refreshToken)).isEqualTo("REFRESH");
    }

    @Test
    @DisplayName("isTokenValid should return true for valid matching access token")
    void isTokenValid_WithValidTokenAndMatchingEmail_ReturnsTrue() {
        String email = "student@ai-exam.local";
        String token = jwtService.generateAccessToken(email, "STUDENT");

        boolean isValid = jwtService.isTokenValid(token, email);

        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("isTokenValid should return false when email does not match token subject")
    void isTokenValid_WithMismatchedEmail_ReturnsFalse() {
        String token = jwtService.generateAccessToken("student@ai-exam.local", "STUDENT");

        boolean isValid = jwtService.isTokenValid(token, "other@ai-exam.local");

        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("isTokenValid should return false when given a refresh token instead of access token")
    void isTokenValid_WithRefreshToken_ReturnsFalse() {
        String email = "student@ai-exam.local";
        String refreshToken = jwtService.generateRefreshToken(email);

        boolean isValid = jwtService.isTokenValid(refreshToken, email);

        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("isRefreshToken should return true for valid refresh token and false for access token")
    void isRefreshToken_Validation() {
        String email = "student@ai-exam.local";
        String refreshToken = jwtService.generateRefreshToken(email);
        String accessToken = jwtService.generateAccessToken(email, "STUDENT");

        assertThat(jwtService.isRefreshToken(refreshToken)).isTrue();
        assertThat(jwtService.isRefreshToken(accessToken)).isFalse();
    }

    @Test
    @DisplayName("getAccessTokenExpiry and getRefreshTokenExpiry should return expiration in seconds")
    void getExpiryMethods_ReturnSeconds() {
        assertThat(jwtService.getAccessTokenExpiry()).isEqualTo(accessExpirationMs / 1000);
        assertThat(jwtService.getRefreshTokenExpiry()).isEqualTo(refreshExpirationMs / 1000);
    }
}
