package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.config.FileStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

class FileStorageServiceTest {

    private FileStorageService fileStorageService;
    private FileStorageProperties properties;

    @TempDir
    Path tempDir;

    private Path snapshotDir;
    private Path audioDir;
    private Path logDir;

    @BeforeEach
    void setUp() {
        snapshotDir = tempDir.resolve("snapshots");
        audioDir = tempDir.resolve("audio");
        logDir = tempDir.resolve("logs");

        properties = new FileStorageProperties() {
            @Override
            public String getSnapshotPath() {
                return snapshotDir.toString();
            }

            @Override
            public String getAudioPath() {
                return audioDir.toString();
            }

            @Override
            public String getLogPath() {
                return logDir.toString();
            }
        };

        fileStorageService = new FileStorageService(properties);
        fileStorageService.init();
    }

    @Test
    void testSaveSnapshotNormalFilename() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-image.png",
                "image/png",
                "content".getBytes()
        );

        String savedPath = fileStorageService.saveSnapshot(file);

        assertThat(savedPath).startsWith(snapshotDir.toAbsolutePath().toString());
        assertThat(new File(savedPath)).exists();
    }

    @Test
    void testSaveSnapshotPathTraversalPrevented() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "../../malicious.txt",
                "text/plain",
                "malicious content".getBytes()
        );

        String savedPath = fileStorageService.saveSnapshot(file);

        Path path = Paths.get(savedPath);
        assertThat(path.startsWith(snapshotDir.toAbsolutePath())).isTrue();
        assertThat(path.getFileName().toString()).doesNotContain("..");
        assertThat(new File(savedPath)).exists();
    }
}
