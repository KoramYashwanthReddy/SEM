package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.config.FileStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private FileStorageProperties properties;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        fileStorageService = new FileStorageService(properties);
    }

    @Test
    void initCreatesStorageDirectoriesWhenTheyDoNotExist(@TempDir Path tempDir) {
        Path snapshotPath = tempDir.resolve("snapshots");
        Path audioPath = tempDir.resolve("audio");
        Path logPath = tempDir.resolve("logs");

        when(properties.getSnapshotPath()).thenReturn(snapshotPath.toString());
        when(properties.getAudioPath()).thenReturn(audioPath.toString());
        when(properties.getLogPath()).thenReturn(logPath.toString());

        assertThat(Files.exists(snapshotPath)).isFalse();
        assertThat(Files.exists(audioPath)).isFalse();
        assertThat(Files.exists(logPath)).isFalse();

        fileStorageService.init();

        assertThat(Files.exists(snapshotPath)).isTrue();
        assertThat(Files.isDirectory(snapshotPath)).isTrue();

        assertThat(Files.exists(audioPath)).isTrue();
        assertThat(Files.isDirectory(audioPath)).isTrue();

        assertThat(Files.exists(logPath)).isTrue();
        assertThat(Files.isDirectory(logPath)).isTrue();
    }

    @Test
    void initHandlesAlreadyExistingDirectories(@TempDir Path tempDir) throws IOException {
        Path snapshotPath = Files.createDirectory(tempDir.resolve("snapshots"));
        Path audioPath = Files.createDirectory(tempDir.resolve("audio"));
        Path logPath = Files.createDirectory(tempDir.resolve("logs"));

        when(properties.getSnapshotPath()).thenReturn(snapshotPath.toString());
        when(properties.getAudioPath()).thenReturn(audioPath.toString());
        when(properties.getLogPath()).thenReturn(logPath.toString());

        fileStorageService.init();

        assertThat(Files.isDirectory(snapshotPath)).isTrue();
        assertThat(Files.isDirectory(audioPath)).isTrue();
        assertThat(Files.isDirectory(logPath)).isTrue();
    }

    @Test
    void initThrowsRuntimeExceptionWhenDirectoryCreationFails(@TempDir Path tempDir) throws IOException {
        Path filePathAsDir = tempDir.resolve("file_blocking_dir");
        Files.createFile(filePathAsDir);

        Path conflictSubPath = filePathAsDir.resolve("sub_dir");

        when(properties.getSnapshotPath()).thenReturn(conflictSubPath.toString());

        assertThatThrownBy(() -> fileStorageService.init())
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Could not create storage directories")
                .hasCauseInstanceOf(IOException.class);
    }
}
