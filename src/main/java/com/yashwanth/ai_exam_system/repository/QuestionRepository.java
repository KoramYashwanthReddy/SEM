package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    // Get all questions for an exam
    List<Question> findByExamCode(String examCode);

    // Get questions by exam and type
    List<Question> findByExamCodeAndQuestionType(String examCode, QuestionType questionType);

    // Count questions in exam
    long countByExamCode(String examCode);

}