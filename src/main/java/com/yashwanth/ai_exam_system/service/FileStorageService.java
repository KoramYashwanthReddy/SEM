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
            Files.createDirectories(Paths.get(properties.getSnapshotPath()).toAbsolutePath().normalize());
            Files.createDirectories(Paths.get(properties.getAudioPath()).toAbsolutePath().normalize());
            Files.createDirectories(Paths.get(properties.getLogPath()).toAbsolutePath().normalize());
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
        Path targetDir = Paths.get(properties.getLogPath()).toAbsolutePath().normalize();
        Path path = targetDir.resolve(fileName).normalize();

        if (!path.startsWith(targetDir)) {
            throw new SecurityException("Cannot store log file outside target directory");
        }

        try (FileOutputStream fos = new FileOutputStream(path.toFile())) {
            fos.write(data.getBytes());
        }

        return path.toString();
    }

    // 🔁 Common File Save Logic
    private String saveFile(MultipartFile file, String dirPath) throws IOException {

        String originalName = file.getOriginalFilename();
        String safeName = UUID.randomUUID() + "_" + cleanFilename(originalName);

        Path targetDir = Paths.get(dirPath).toAbsolutePath().normalize();
        Path targetPath = targetDir.resolve(safeName).normalize();

        if (!targetPath.startsWith(targetDir)) {
            throw new SecurityException("Cannot store file outside target directory: " + originalName);
        }

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return targetPath.toString();
    }

    private String cleanFilename(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "file";
        }
        String name = originalName.trim();
        int lastUnixPos = name.lastIndexOf('/');
        int lastWindowsPos = name.lastIndexOf('\\');
        int index = Math.max(lastUnixPos, lastWindowsPos);
        if (index != -1) {
            name = name.substring(index + 1);
        }
        if (name.isBlank() || "..".equals(name) || ".".equals(name)) {
            return "file";
        }
        name = name.replaceAll("[/\\\\]", "_");
        return name;
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
