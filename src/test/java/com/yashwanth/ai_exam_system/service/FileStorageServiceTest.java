package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.config.FileStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private FileStorageProperties properties;

    @Mock
    private MultipartFile multipartFile;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        when(properties.getSnapshotPath()).thenReturn(tempDir.resolve("snapshots").toString());
        when(properties.getAudioPath()).thenReturn(tempDir.resolve("audio").toString());
        when(properties.getLogPath()).thenReturn(tempDir.resolve("logs").toString());

        fileStorageService = new FileStorageService(properties);
        fileStorageService.init();
    }

    @Test
    void saveSnapshot_whenFileSizeExceeds10MB_throwsRuntimeException() {
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getSize()).thenReturn(10 * 1024 * 1024 + 1L);

        assertThatThrownBy(() -> fileStorageService.saveSnapshot(multipartFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("File size exceeds limit (10MB)");
    }
}
