package com.yashwanth.ai_exam_system.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;

import com.yashwanth.ai_exam_system.security.CustomUserDetailsService;
import com.yashwanth.ai_exam_system.security.JwtAuthenticationFilter;
import com.yashwanth.ai_exam_system.security.RestAuthenticationEntryPoint;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    public SecurityConfig(
            JwtAuthenticationFilter jwtFilter,
            CustomUserDetailsService userDetailsService,
            RestAuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtFilter = jwtFilter;
        this.userDetailsService = userDetailsService;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth

                    // ✅ Allow frontend static files
                    .requestMatchers(
                            "/",
                            "/index.html",
                            "/pages/**",
                            "/assets/**",
                            "/*.html",
                            "/favicon.ico",
                            "/ws/**"
                    ).permitAll()

                    // ✅ Let browser navigations reach the MVC/resource layer so missing pages can return 404
                    .requestMatchers(browserDocumentRequest()).permitAll()

                    // ✅ Public APIs
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/certificate/verify/**").permitAll()
                    .requestMatchers("/api/public/**").permitAll()
                    .requestMatchers("/api/home/**").permitAll()

                    // Admin APIs
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")

                    // Teacher APIs
                    .requestMatchers("/api/teacher/**")
                    .hasAnyRole("TEACHER", "ADMIN")

                    // Question management (for teachers)
                    .requestMatchers("/api/questions/**")
                    .hasAnyRole("TEACHER", "ADMIN")

                    // Student APIs
                    .requestMatchers("/api/student/**").hasRole("STUDENT")

                    // everything else secured
                    .anyRequest().authenticated()
            )

            .authenticationProvider(authenticationProvider())
            .exceptionHandling(exceptionHandling ->
                    exceptionHandling.authenticationEntryPoint(authenticationEntryPoint))
            .addFilterBefore(jwtFilter,
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(passwordEncoder());
        provider.setUserDetailsService(userDetailsService);

        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {

        return config.getAuthenticationManager();
    }

    @Bean
    public RequestMatcher browserDocumentRequest() {
        return request -> {
            if (request == null) {
                return false;
            }

            String method = request.getMethod();
            if (!HttpMethod.GET.matches(method) && !HttpMethod.HEAD.matches(method)) {
                return false;
            }

            String path = request.getRequestURI();
            if (path == null) {
                return false;
            }

            return !path.startsWith("/api/")
                    && !path.startsWith("/ws/")
                    && !path.startsWith("/error");
        };
    }
}
