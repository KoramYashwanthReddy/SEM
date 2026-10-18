package com.yashwanth.ai_exam_system.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FaviconControllerTest {

    private MockMvc mockMvc;
    private FaviconController faviconController;

    @BeforeEach
    void setUp() {
        faviconController = new FaviconController();
        mockMvc = MockMvcBuilders.standaloneSetup(faviconController).build();
    }

    @Test
    void faviconEndpointReturnsOkAndSvgContent() throws Exception {
        mockMvc.perform(get("/favicon.ico"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "public, max-age=86400"))
                .andExpect(content().contentType("image/svg+xml"))
                .andExpect(content().string(containsString("<svg")))
                .andExpect(content().string(containsString("aria-label=\"SEM\"")));
    }

    @Test
    void faviconMethodReturnsResponseEntityWithCorrectHeaderAndBody() {
        ResponseEntity<byte[]> response = faviconController.favicon();

        assertThat(response).isNotNull();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL)).isEqualTo("public, max-age=86400");
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.parseMediaType("image/svg+xml"));

        assertThat(response.getBody()).isNotNull();
        String bodyString = new String(response.getBody(), StandardCharsets.UTF_8);
        assertThat(bodyString).contains("<svg");
        assertThat(bodyString).contains("aria-label=\"SEM\"");
        assertThat(bodyString).contains("</svg>");
    }
}
