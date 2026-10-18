package com.yashwanth.ai_exam_system.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;

@Service
public class AudioAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(AudioAnalysisService.class);

    public String analyzeAudio(String filePath) {
        try (FileInputStream fis = new FileInputStream(filePath)) {

            byte[] buffer = fis.readAllBytes();

            double energy = calculateEnergy(buffer);

            // 🔥 Tune this threshold based on testing
            if (energy > 5000) {
                return "HIGH_NOISE_DETECTED";
            }

            return "NORMAL";

        } catch (Exception e) {
            logger.error("Error analyzing audio file at path: {}", filePath, e);
            return "ERROR";
        }
    }

    private double calculateEnergy(byte[] audioBytes) {
        double sum = 0;

        for (byte b : audioBytes) {
            sum += b * b;
        }

        return sum / audioBytes.length;
    }
}
