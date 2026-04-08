package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    List<AdminNotification> findAllByOrderByCreatedAtDesc();

    List<AdminNotification> findByCategoryIgnoreCaseOrderByCreatedAtDesc(String category);

    List<AdminNotification> findByUnreadTrueOrderByCreatedAtDesc();

    List<AdminNotification> findByUnreadTrueAndCategoryIgnoreCaseOrderByCreatedAtDesc(String category);

    long countByUnreadTrue();
}
