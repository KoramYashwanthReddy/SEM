package com.yashwanth.ai_exam_system.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:8080}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-methods:GET,POST,PUT,PATCH,DELETE,OPTIONS}")
    private String allowedMethods;

    @Value("${app.cors.allowed-headers:Authorization,Content-Type,X-Requested-With,Accept,Origin}")
    private String allowedHeaders;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(splitCsv(allowedOrigins)));
        configuration.setAllowedMethods(Arrays.asList(splitCsv(allowedMethods)));
        configuration.setAllowedHeaders(Arrays.asList(splitCsv(allowedHeaders)));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(splitCsv(allowedOrigins))
                        .allowedMethods(splitCsv(allowedMethods))
                        .allowedHeaders(splitCsv(allowedHeaders));
            }
        };
    }

    private String[] splitCsv(String csv) {
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toArray(String[]::new);
    }
}
