package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.TeacherNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeacherNotificationRepository extends JpaRepository<TeacherNotification, Long> {

    List<TeacherNotification> findByRecipientKeyIgnoreCaseOrderByCreatedAtDesc(String recipientKey);

    List<TeacherNotification> findByRecipientKeyIgnoreCaseAndUnreadTrueOrderByCreatedAtDesc(String recipientKey);

    long countByRecipientKeyIgnoreCaseAndUnreadTrue(String recipientKey);
}
