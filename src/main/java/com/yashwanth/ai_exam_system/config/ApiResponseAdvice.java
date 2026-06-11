package com.yashwanth.ai_exam_system.config;

import com.yashwanth.ai_exam_system.dto.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Global Response Wrapper
 * Automatically wraps all successful responses in an ApiResponse object.
 */
@RestControllerAdvice(basePackages = "com.yashwanth.ai_exam_system.controller")
public class ApiResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        // Don't wrap if already wrapped
        return !returnType.getParameterType().equals(ApiResponse.class);
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {

        // If body is already ApiResponse or null, skip
        if (body instanceof ApiResponse || body == null) {
            return body;
        }

        // Do not wrap byte arrays or resources (e.g., images, files, favicon)
        if (body instanceof byte[] || body instanceof org.springframework.core.io.Resource) {
            return body;
        }

        // Return standardized success response
        return ApiResponse.success("Operation successful", body);
    }
}
