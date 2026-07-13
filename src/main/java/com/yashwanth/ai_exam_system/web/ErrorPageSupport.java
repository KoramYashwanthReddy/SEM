package com.yashwanth.ai_exam_system.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public final class ErrorPageSupport {

    private ErrorPageSupport() {
    }

    public static boolean prefersHtml(HttpServletRequest request) {
        if (request == null) {
            return false;
        }

        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept != null) {
            String normalized = accept.toLowerCase();
            if (normalized.contains(MediaType.APPLICATION_JSON_VALUE)) {
                return false;
            }
            if (normalized.contains(MediaType.TEXT_HTML_VALUE) ||
                    normalized.contains("application/xhtml+xml")) {
                return true;
            }
        }

        String xRequestedWith = request.getHeader("X-Requested-With");
        boolean browserNavigation = "GET".equalsIgnoreCase(request.getMethod())
                || "HEAD".equalsIgnoreCase(request.getMethod());

        return browserNavigation && (xRequestedWith == null || xRequestedWith.isBlank());
    }

    public static ResponseEntity<String> render(HttpStatus status, String resourcePath) {
        return ResponseEntity.status(status)
                .contentType(MediaType.TEXT_HTML)
                .body(readResource(resourcePath));
    }

    public static void writeHtml(HttpServletResponse response, HttpStatus status, String resourcePath)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.TEXT_HTML_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        try (PrintWriter writer = response.getWriter()) {
            writer.write(readResource(resourcePath));
        }
    }

    private static String readResource(String resourcePath) {
        ClassPathResource resource = new ClassPathResource(resourcePath);
        try (InputStream inputStream = resource.getInputStream()) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load error page: " + resourcePath, ex);
        }
    }
}
