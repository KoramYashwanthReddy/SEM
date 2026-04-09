package com.yashwanth.ai_exam_system.service;

import nu.pattern.OpenCV;
import org.opencv.core.*;
import org.opencv.objdetect.CascadeClassifier;
import org.opencv.imgcodecs.Imgcodecs;
import org.springframework.stereotype.Service;

@Service
public class FaceDetectionService {

    private final CascadeClassifier faceDetector;

    public FaceDetectionService() {
        OpenCV.loadLocally();

        faceDetector = new CascadeClassifier(
                "src/main/resources/haarcascade_frontalface_default.xml"
        );
    }

    public int detectFaces(String imagePath) {

        Mat image = Imgcodecs.imread(imagePath);
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
}