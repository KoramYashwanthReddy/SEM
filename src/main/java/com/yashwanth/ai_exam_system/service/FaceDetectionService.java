package com.yashwanth.ai_exam_system.service;

import nu.pattern.OpenCV;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.objdetect.CascadeClassifier;
import org.opencv.core.Mat;
import org.opencv.core.MatOfRect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class FaceDetectionService {

    private static final Logger log = LoggerFactory.getLogger(FaceDetectionService.class);
    private static final String CASCADE_FILE_NAME = "haarcascade_frontalface_default.xml";

    private final CascadeClassifier faceDetector;

    public FaceDetectionService() {
        OpenCV.loadLocally();
        faceDetector = loadCascadeClassifier();
    }

    public int detectFaces(String imagePath) {
        if (faceDetector.empty()) {
            return 0;
        }

        Mat image = Imgcodecs.imread(imagePath);
        if (image.empty()) {
            return 0;
        }

        MatOfRect faceDetections = new MatOfRect();

        faceDetector.detectMultiScale(image, faceDetections);

        return faceDetections.toArray().length;
    }

    public String analyzeFace(String imagePath) {

        int faces = detectFaces(imagePath);

        if (faces == 0) return "NO_FACE_DETECTED";
        if (faces > 1) return "MULTIPLE_FACES_DETECTED";

        return "VALID";
    }

    private CascadeClassifier loadCascadeClassifier() {
        ClassPathResource resource = new ClassPathResource(CASCADE_FILE_NAME);
        if (!resource.exists()) {
            log.warn("Face cascade model '{}' was not found on classpath. Face detection will be disabled.",
                    CASCADE_FILE_NAME);
            return new CascadeClassifier();
        }

        try {
            Path tempFile = Files.createTempFile("opencv-face-cascade-", ".xml");
            tempFile.toFile().deleteOnExit();

            try (InputStream inputStream = resource.getInputStream()) {
                Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }

            CascadeClassifier classifier = new CascadeClassifier(tempFile.toString());
            if (classifier.empty()) {
                log.warn("Face cascade model '{}' could not be loaded. Face detection will be disabled.",
                        CASCADE_FILE_NAME);
            }
            return classifier;
        } catch (IOException exception) {
            log.warn("Failed to load face cascade model '{}'. Face detection will be disabled: {}",
                    CASCADE_FILE_NAME, exception.getMessage());
            return new CascadeClassifier();
        }
    }
}
