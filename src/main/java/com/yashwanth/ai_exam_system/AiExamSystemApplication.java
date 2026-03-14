package com.yashwanth.ai_exam_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AiExamSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(AiExamSystemApplication.class, args);
	}

}
