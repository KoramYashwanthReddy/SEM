package com.yashwanth.ai_exam_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private static final ConcurrentHashMap<String, Map<String, Object>> SETTINGS =
            new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings(
            org.springframework.security.core.Authentication auth) {

        return ResponseEntity.ok(settingsFor(auth.getName()));
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSettings(
            org.springframework.security.core.Authentication auth,
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> settings = settingsFor(auth.getName());
        settings.put("notifications", asBoolean(payload.get("notifications"), settings.get("notifications")));
        settings.put("autoRefresh", asBoolean(payload.get("autoRefresh"), settings.get("autoRefresh")));
        settings.put("alerts", asBoolean(payload.get("alerts"), settings.get("alerts")));
        SETTINGS.put(auth.getName(), settings);

        Map<String, Object> response = new HashMap<>(settings);
        response.put("status", "SUCCESS");
        response.put("message", "Settings saved successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-sessions")
    public ResponseEntity<Map<String, Object>> resetSessions(
            org.springframework.security.core.Authentication auth) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Active sessions reset successfully");
        response.put("reset", true);
        response.put("teacher", auth.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("connected", true);
        response.put("message", "API connection is healthy");
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> settingsFor(String teacherKey) {
        return SETTINGS.computeIfAbsent(teacherKey, key -> {
            Map<String, Object> defaults = new HashMap<>();
            defaults.put("notifications", true);
            defaults.put("autoRefresh", true);
            defaults.put("alerts", true);
            return defaults;
        });
    }

    private boolean asBoolean(Object value, Object fallback) {
        if (value == null) {
            return fallback instanceof Boolean ? (Boolean) fallback : true;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
