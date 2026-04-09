package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.config.FileStorageProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private final FileStorageProperties properties;

    public FileStorageService(FileStorageProperties properties) {
        this.properties = properties;
    }

    // ✅ Auto-create directories on startup
    @PostConstruct
    public void init() {
        createDirectories();
    }

    private void createDirectories() {
        try {
            Files.createDirectories(Paths.get(properties.getSnapshotPath()));
            Files.createDirectories(Paths.get(properties.getAudioPath()));
            Files.createDirectories(Paths.get(properties.getLogPath()));
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directories", e);
        }
    }

    // 📸 Save Snapshot
    public String saveSnapshot(MultipartFile file) throws IOException {
        validateFile(file);
        return saveFile(file, properties.getSnapshotPath());
    }

    // 🎤 Save Audio
    public String saveAudio(MultipartFile file) throws IOException {
        validateFile(file);
        return saveFile(file, properties.getAudioPath());
    }

    // 📄 Save Log
    public String saveLog(String data) throws IOException {
        String fileName = UUID.randomUUID() + ".txt";
        Path path = Paths.get(properties.getLogPath(), fileName);

        try (FileOutputStream fos = new FileOutputStream(path.toFile())) {
            fos.write(data.getBytes());
        }

        return path.toAbsolutePath().toString();
    }

    // 🔁 Common File Save Logic
    private String saveFile(MultipartFile file, String dirPath) throws IOException {

        String originalName = file.getOriginalFilename();
        String safeName = UUID.randomUUID() + "_" + (originalName != null ? originalName : "file");

        Path path = Paths.get(dirPath, safeName);

        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

        return path.toAbsolutePath().toString();
    }

    // 🔒 Basic Validation
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        if (file.getSize() > 10 * 1024 * 1024) { // 10MB limit
            throw new RuntimeException("File size exceeds limit (10MB)");
        }
    }
}