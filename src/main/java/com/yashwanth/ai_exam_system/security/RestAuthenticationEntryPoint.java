package com.yashwanth.ai_exam_system.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yashwanth.ai_exam_system.dto.ApiResponse;
import com.yashwanth.ai_exam_system.web.ErrorPageSupport;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {

        if (ErrorPageSupport.prefersHtml(request)) {
            ErrorPageSupport.writeHtml(response, HttpStatus.UNAUTHORIZED, "static/error/401.html");
            return;
        }

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> error = new LinkedHashMap<>();
        error.put("status", "ERROR");
        error.put("errorCode", "UNAUTHORIZED");
        error.put("message", "Unauthorized");
        error.put("path", request.getRequestURI());
        error.put("timestamp", System.currentTimeMillis());

        ApiResponse<Map<String, Object>> body = ApiResponse.<Map<String, Object>>builder()
                .status("ERROR")
                .message("Unauthorized")
                .data(error)
                .errorCode("UNAUTHORIZED")
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
