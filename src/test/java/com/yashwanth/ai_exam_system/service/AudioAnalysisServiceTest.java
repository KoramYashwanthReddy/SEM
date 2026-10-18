package com.yashwanth.ai_exam_system.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AudioAnalysisServiceTest {

    private AudioAnalysisService audioAnalysisService;

    @BeforeEach
    void setUp() {
        audioAnalysisService = new AudioAnalysisService();
    }

    @Test
    void analyzeAudio_returnsNormal_whenEnergyIsLow(@TempDir Path tempDir) throws IOException {
        File audioFile = tempDir.resolve("normal.wav").toFile();
        try (FileOutputStream fos = new FileOutputStream(audioFile)) {
            // Low energy bytes (e.g. values 1, 2, -1, -2)
            byte[] bytes = new byte[]{1, 2, -1, -2, 1, 0, -1, 0};
            fos.write(bytes);
        }

        String result = audioAnalysisService.analyzeAudio(audioFile.getAbsolutePath());
        assertEquals("NORMAL", result);
    }

    @Test
    void analyzeAudio_returnsHighNoiseDetected_whenEnergyIsHigh(@TempDir Path tempDir) throws IOException {
        File audioFile = tempDir.resolve("high_noise.wav").toFile();
        try (FileOutputStream fos = new FileOutputStream(audioFile)) {
            // High energy bytes (e.g. values 100, -100)
            // sum of squares for 100 is 10000, which average is 10000 > 5000
            byte[] bytes = new byte[100];
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] = 100;
            }
            fos.write(bytes);
        }

        String result = audioAnalysisService.analyzeAudio(audioFile.getAbsolutePath());
        assertEquals("HIGH_NOISE_DETECTED", result);
    }

    @Test
    void analyzeAudio_returnsError_whenFileDoesNotExist() {
        String result = audioAnalysisService.analyzeAudio("non_existent_file.wav");
        assertEquals("ERROR", result);
    }
}
