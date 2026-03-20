package com.yashwanth.ai_exam_system.dto;

import java.util.List;

public class AIAnalysisResponse {

    public List<TopicPerformanceDTO> getPerformance() {
		return performance;
	}
	public void setPerformance(List<TopicPerformanceDTO> performance) {
		this.performance = performance;
	}
	public List<WeakTopicDTO> getWeakTopics() {
		return weakTopics;
	}
	public void setWeakTopics(List<WeakTopicDTO> weakTopics) {
		this.weakTopics = weakTopics;
	}
	public String getOverallFeedback() {
		return overallFeedback;
	}
	public void setOverallFeedback(String overallFeedback) {
		this.overallFeedback = overallFeedback;
	}
	private List<TopicPerformanceDTO> performance;
    private List<WeakTopicDTO> weakTopics;
    private String overallFeedback;

    // Getters & Setters
}