package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.CheatingAlertDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketAlertService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketAlertService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendCheatingAlert(CheatingAlertDTO alert) {
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }
}