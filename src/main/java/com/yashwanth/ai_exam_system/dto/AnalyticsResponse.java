package com.yashwanth.ai_exam_system.dto;

import java.util.List;

public class AnalyticsResponse {

    private List<Integer> scores;
    private List<String> dates;

    private double averageScore;
    private double highestScore;
    private double lowestScore;
	public List<Integer> getScores() {
		return scores;
	}
	public void setScores(List<Integer> scores) {
		this.scores = scores;
	}
	public List<String> getDates() {
		return dates;
	}
	public void setDates(List<String> dates) {
		this.dates = dates;
	}
	public double getAverageScore() {
		return averageScore;
	}
	public void setAverageScore(double averageScore) {
		this.averageScore = averageScore;
	}
	public double getHighestScore() {
		return highestScore;
	}
	public void setHighestScore(double highestScore) {
		this.highestScore = highestScore;
	}
	public double getLowestScore() {
		return lowestScore;
	}
	public void setLowestScore(double lowestScore) {
		this.lowestScore = lowestScore;
	}

    // Getters & Setters
}