package com.yashwanth.ai_exam_system.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FileStorageProperties {

    @Value("${file.storage.base-path}")
    private String basePath;

    @Value("${file.storage.snapshot-path}")
    private String snapshotPath;

    @Value("${file.storage.audio-path}")
    private String audioPath;

    @Value("${file.storage.log-path}")
    private String logPath;

    public String getBasePath() { return basePath; }
    public String getSnapshotPath() { return snapshotPath; }
    public String getAudioPath() { return audioPath; }
    public String getLogPath() { return logPath; }
}