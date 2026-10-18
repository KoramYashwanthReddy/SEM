package com.yashwanth.ai_exam_system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.service.ProctoringEventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ProctoringEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProctoringEventService eventService;

    @Test
    @WithMockUser(roles = "STUDENT")
    void triggerAnalysis_ReturnsSuccessResponse() throws Exception {
        Long attemptId = 100L;
        doNothing().when(eventService).triggerAnalysis(attemptId);

        mockMvc.perform(post("/api/proctoring/events/analyze/{attemptId}", attemptId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.message").value("AI analysis triggered"));

        verify(eventService).triggerAnalysis(attemptId);
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void logEvent_ReturnsSuccessWithSavedData() throws Exception {
        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(100L);
        event.setEventType("TAB_SWITCH");
        event.setDetails("Switched tab");

        ProctoringEvent savedEvent = new ProctoringEvent();
        savedEvent.setId(1L);
        savedEvent.setAttemptId(100L);
        savedEvent.setEventType("TAB_SWITCH");
        savedEvent.setDetails("Switched tab");

        when(eventService.logEvent(any(ProctoringEvent.class))).thenReturn(savedEvent);

        mockMvc.perform(post("/api/proctoring/events/log")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.message").value("Event logged successfully"))
                .andExpect(jsonPath("$.data.data.id").value(1))
                .andExpect(jsonPath("$.data.data.attemptId").value(100))
                .andExpect(jsonPath("$.data.data.eventType").value("TAB_SWITCH"));

        verify(eventService).logEvent(any(ProctoringEvent.class));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void countEvents_ReturnsEventCount() throws Exception {
        Long attemptId = 100L;
        when(eventService.countEvents(attemptId)).thenReturn(5L);

        mockMvc.perform(get("/api/proctoring/events/count/{attemptId}", attemptId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.message").value("Event count fetched"))
                .andExpect(jsonPath("$.data.data.count").value(5));

        verify(eventService).countEvents(attemptId);
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void countByType_ReturnsEventTypeCount() throws Exception {
        Long attemptId = 100L;
        String type = "TAB_SWITCH";
        when(eventService.countByType(attemptId, type)).thenReturn(3L);

        mockMvc.perform(get("/api/proctoring/events/count/{attemptId}/{type}", attemptId, type))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.message").value("Event type count fetched"))
                .andExpect(jsonPath("$.data.data.type").value("TAB_SWITCH"))
                .andExpect(jsonPath("$.data.data.count").value(3));

        verify(eventService).countByType(attemptId, type);
    }
}
