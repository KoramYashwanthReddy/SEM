package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.exception.GlobalExceptionHandler;
import com.yashwanth.ai_exam_system.service.HomeSummaryService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class HomeControllerTest {

    private MockMvc mockMvc;

    @Mock
    private HomeSummaryService homeSummaryService;

    @InjectMocks
    private HomeController homeController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(homeController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/home/summary - Success returns summary data")
    void getSummary_ReturnsSuccessResponseWithData() throws Exception {
        // Given
        Map<String, Object> mockSummaryData = new LinkedHashMap<>();

        Map<String, Object> hero = new LinkedHashMap<>();
        hero.put("examsConducted", 10);
        hero.put("passRate", 85.5);
        hero.put("certificatesIssued", 5);

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("activeStudents", 25);
        analytics.put("totalTeachers", 4);

        Map<String, Object> meta = Map.of("totalStudents", 50, "totalExams", 12);

        mockSummaryData.put("hero", hero);
        mockSummaryData.put("analytics", analytics);
        mockSummaryData.put("meta", meta);

        given(homeSummaryService.getSummary()).willReturn(mockSummaryData);

        // When & Then
        mockMvc.perform(get("/api/home/summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("Home summary fetched"))
                .andExpect(jsonPath("$.data.hero.examsConducted").value(10))
                .andExpect(jsonPath("$.data.hero.passRate").value(85.5))
                .andExpect(jsonPath("$.data.hero.certificatesIssued").value(5))
                .andExpect(jsonPath("$.data.analytics.activeStudents").value(25))
                .andExpect(jsonPath("$.data.analytics.totalTeachers").value(4))
                .andExpect(jsonPath("$.data.meta.totalStudents").value(50))
                .andExpect(jsonPath("$.data.meta.totalExams").value(12));

        verify(homeSummaryService).getSummary();
    }

    @Test
    @DisplayName("GET /api/home/summary - Success returns empty map when service returns empty map")
    void getSummary_ReturnsSuccessResponseWhenDataIsEmpty() throws Exception {
        // Given
        given(homeSummaryService.getSummary()).willReturn(Collections.emptyMap());

        // When & Then
        mockMvc.perform(get("/api/home/summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("Home summary fetched"))
                .andExpect(jsonPath("$.data").isMap())
                .andExpect(jsonPath("$.data").isEmpty());

        verify(homeSummaryService).getSummary();
    }

    @Test
    @DisplayName("GET /api/home/summary - Handles service exception gracefully")
    void getSummary_HandlesServiceException() throws Exception {
        // Given
        given(homeSummaryService.getSummary()).willThrow(new RuntimeException("Failed to load home summary"));

        // When & Then
        mockMvc.perform(get("/api/home/summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Failed to load home summary"))
                .andExpect(jsonPath("$.errorCode").value("RUNTIME_ERROR"));

        verify(homeSummaryService).getSummary();
    }
}
