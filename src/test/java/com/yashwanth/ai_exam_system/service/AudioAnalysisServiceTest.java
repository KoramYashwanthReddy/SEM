package com.yashwanth.ai_exam_system.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class AudioAnalysisServiceTest {

    private final AudioAnalysisService audioAnalysisService = new AudioAnalysisService();

    @Test
    void analyzeAudio_ReturnsNormal_WhenAudioEnergyIsLow(@TempDir Path tempDir) throws IOException {
        File tempFile = tempDir.resolve("normal_audio.pcm").toFile();
        byte[] audioBytes = new byte[100];
        // Low energy bytes
        for (int i = 0; i < audioBytes.length; i++) {
            audioBytes[i] = 10;
        }
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(audioBytes);
        }

        String result = audioAnalysisService.analyzeAudio(tempFile.getAbsolutePath());

        assertThat(result).isEqualTo("NORMAL");
    }

    @Test
    void analyzeAudio_ReturnsHighNoise_WhenAudioEnergyIsHigh(@TempDir Path tempDir) throws IOException {
        File tempFile = tempDir.resolve("loud_audio.pcm").toFile();
        byte[] audioBytes = new byte[100];
        // High energy bytes (100 * 100 = 10000 > 5000 threshold)
        for (int i = 0; i < audioBytes.length; i++) {
            audioBytes[i] = 100;
        }
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(audioBytes);
        }

        String result = audioAnalysisService.analyzeAudio(tempFile.getAbsolutePath());

        assertThat(result).isEqualTo("HIGH_NOISE_DETECTED");
    }

    @Test
    void analyzeAudio_ReturnsError_WhenFileDoesNotExist() {
        String nonExistentPath = "/path/to/non_existent_audio_file.wav";

        String result = audioAnalysisService.analyzeAudio(nonExistentPath);

        assertThat(result).isEqualTo("ERROR");
    }
}
