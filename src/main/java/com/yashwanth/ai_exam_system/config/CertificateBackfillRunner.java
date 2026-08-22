package com.yashwanth.ai_exam_system.config;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.service.CertificateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class CertificateBackfillRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(CertificateBackfillRunner.class);

    private final ExamResultRepository examResultRepository;
    private final CertificateService certificateService;
    private final com.yashwanth.ai_exam_system.repository.ExamRepository examRepository;

    public CertificateBackfillRunner(
            ExamResultRepository examResultRepository,
            CertificateService certificateService,
            com.yashwanth.ai_exam_system.repository.ExamRepository examRepository) {
        this.examResultRepository = examResultRepository;
        this.certificateService = certificateService;
        this.examRepository = examRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int backfilled = examRepository.backfillActiveExams();
            if (backfilled > 0) {
                logger.info("Startup active-state repair: restored {} exams with undefined active status to active=true", backfilled);
            }
        } catch (Exception ex) {
            logger.warn("Startup active-state repair failed: {}", ex.getMessage());
        }

        int issued = 0;
        int scanned = 0;
        for (ExamResult result : examResultRepository.findAll()) {
            if (!isPassed(result)) {
                continue;
            }
            scanned++;
            try {
                if (certificateService.issueCertificateForPassedResult(result, "")) {
                    issued++;
                }
            } catch (Exception ex) {
                logger.warn("Startup certificate repair failed for studentId={} examCode={}: {}",
                        result.getStudentId(), result.getExamCode(), ex.getMessage());
            }
        }
        logger.info("Startup certificate repair finished. scannedPassedResults={} issuedCertificates={}",
                scanned, issued);
    }

    private boolean isPassed(ExamResult result) {
        if (result == null) {
            return false;
        }
        if (Boolean.TRUE.equals(result.getPassed())) {
            return true;
        }
        String status = result.getResultStatus() == null ? "" : result.getResultStatus().trim();
        return "PASS".equalsIgnoreCase(status) || result.getPercentage() >= 40d;
    }
}
