package com.yashwanth.ai_exam_system.dto;

public class WeakTopicDTO {

    private String topic;
    private double accuracy;
    private String recommendation;
	public String getTopic() {
		return topic;
	}
	public void setTopic(String topic) {
		this.topic = topic;
	}
	public double getAccuracy() {
		return accuracy;
	}
	public void setAccuracy(double accuracy) {
		this.accuracy = accuracy;
	}
	public String getRecommendation() {
		return recommendation;
	}
	public void setRecommendation(String recommendation) {
		this.recommendation = recommendation;
	}

    // Getters & Setters
}