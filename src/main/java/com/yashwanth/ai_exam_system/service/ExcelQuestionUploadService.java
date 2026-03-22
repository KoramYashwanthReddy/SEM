package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Service
public class ExcelQuestionUploadService {

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;

    public ExcelQuestionUploadService(QuestionRepository questionRepository,
                                      ExamRepository examRepository) {
        this.questionRepository = questionRepository;
        this.examRepository = examRepository;
    }

    public void uploadQuestions(MultipartFile file) throws Exception {

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            Iterator<Row> rows = sheet.iterator();

            if (rows.hasNext()) {
                rows.next(); // skip header
            }

            List<Question> questions = new ArrayList<>();

            int mcq = 0;
            int coding = 0;
            int descriptive = 0;

            String examCode = null;

            while (rows.hasNext()) {

                Row row = rows.next();

                if (row == null || row.getCell(0) == null) {
                    continue;
                }

                String code = getCellValue(row, 0);

                if (code == null || code.isBlank()) {
                    continue;
                }

                if (examCode == null) {
                    examCode = code;
                }

                if (!examCode.equals(code)) {
                    throw new RuntimeException("Multiple exam codes found in file.");
                }

                String typeStr = getCellValue(row, 1);
                if (typeStr == null) continue;

                QuestionType type = QuestionType.valueOf(typeStr.toUpperCase());

                String questionText = getCellValue(row, 3);
                if (questionText == null || questionText.isBlank()) continue;

                Question q = new Question();

                q.setExamCode(examCode);
                q.setQuestionType(type);
                q.setDifficulty(getCellValue(row, 2));
                q.setQuestionText(questionText);

                if (type == QuestionType.MCQ) {

                    q.setOptionA(getCellValue(row, 4));
                    q.setOptionB(getCellValue(row, 5));
                    q.setOptionC(getCellValue(row, 6));
                    q.setOptionD(getCellValue(row, 7));

                    q.setCorrectAnswer(getCellValue(row, 8));

                    mcq++;

                } else if (type == QuestionType.CODING) {

                    q.setSampleInput(getCellValue(row, 4));
                    q.setSampleOutput(getCellValue(row, 5));

                    coding++;

                } else {
                    descriptive++;
                }

                q.setMarks((int) getNumericValue(row, 9));

                // 🔥 FIX: SET TOPIC
                String topic = getCellValue(row, 10);
                if (topic == null || topic.isBlank()) {
                    topic = "general";
                }
                q.setTopic(topic);

                questions.add(q);
            }

            if (examCode == null) {
                throw new RuntimeException("Exam code not found in file");
            }

            Exam exam = examRepository.findByExamCode(examCode)
                    .orElseThrow(() -> new RuntimeException("Exam not found"));

            questionRepository.saveAll(questions);

            exam.setMcqCount(mcq);
            exam.setCodingCount(coding);
            exam.setDescriptiveCount(descriptive);

            exam.setQuestionsUploaded(true);
            exam.setStatus(ExamStatus.QUESTIONS_UPLOADED);

            examRepository.save(exam);
        }
    }

    private String getCellValue(Row row, int index) {

        Cell cell = row.getCell(index);

        if (cell == null) return null;

        if (cell.getCellType() == CellType.STRING) {
            return cell.getStringCellValue().trim();
        }

        if (cell.getCellType() == CellType.NUMERIC) {
            return String.valueOf((int) cell.getNumericCellValue());
        }

        return cell.toString();
    }

    private double getNumericValue(Row row, int index) {

        Cell cell = row.getCell(index);

        if (cell == null) return 0;

        if (cell.getCellType() == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }

        if (cell.getCellType() == CellType.STRING) {
            try {
                return Double.parseDouble(cell.getStringCellValue());
            } catch (Exception e) {
                return 0;
            }
        }

        return 0;
    }
}