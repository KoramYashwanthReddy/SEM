package com.yashwanth.ai_exam_system.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
public class FaviconController {

    @GetMapping(value = "/favicon.ico", produces = "image/svg+xml")
    public ResponseEntity<byte[]> favicon() {
        String svg = """
                <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-label=\"SEM\">
                  <defs>
                    <linearGradient id=\"g\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">
                      <stop offset=\"0%\" stop-color=\"#0ea5e9\"/>
                      <stop offset=\"100%\" stop-color=\"#8b5cf6\"/>
                    </linearGradient>
                  </defs>
                  <rect width=\"64\" height=\"64\" rx=\"16\" fill=\"#0f172a\"/>
                  <circle cx=\"32\" cy=\"32\" r=\"22\" fill=\"url(#g)\" opacity=\"0.95\"/>
                  <path d=\"M21 24h22v4H21zM21 31h22v4H21zM21 38h14v4H21z\" fill=\"#fff\" opacity=\"0.95\"/>
                </svg>
                """;

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType("image/svg+xml"))
                .body(svg.getBytes(StandardCharsets.UTF_8));
    }
}
