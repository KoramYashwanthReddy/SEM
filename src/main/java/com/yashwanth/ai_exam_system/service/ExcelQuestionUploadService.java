package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@Service
public class ExcelQuestionUploadService {

    private static final Logger logger = LoggerFactory.getLogger(ExcelQuestionUploadService.class);

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;

    public ExcelQuestionUploadService(QuestionRepository questionRepository,
                                      ExamRepository examRepository) {
        this.questionRepository = questionRepository;
        this.examRepository = examRepository;
    }

    @Transactional
    public void uploadQuestions(MultipartFile file) throws Exception {
        logger.info("Starting Excel question upload for file: {}", file.getOriginalFilename());

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

            int rowNum = 0;
            while (rows.hasNext()) {
                Row row = rows.next();
                rowNum++;

                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                String code = getCellValue(row, 0);
                if (code == null || code.isBlank()) {
                    logger.warn("Skipping row {}: Exam code is empty", rowNum);
                    continue;
                }

                if (examCode == null) {
                    examCode = code;
                } else if (!examCode.equalsIgnoreCase(code)) {
                    throw new RuntimeException("Multiple exam codes found in file at row " + rowNum + ". Expected: " + examCode + ", Found: " + code);
                }

                String typeStr = getCellValue(row, 1);
                if (typeStr == null || typeStr.isBlank()) {
                    logger.warn("Skipping row {}: Question type is empty", rowNum);
                    continue;
                }

                QuestionType type;
                try {
                    type = QuestionType.valueOf(typeStr.toUpperCase().trim());
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid question type at row " + rowNum + ": " + typeStr + ". Valid types are MCQ, CODING, DESCRIPTIVE.");
                }

                String questionText = getCellValue(row, 3);
                if (questionText == null || questionText.isBlank()) {
                    logger.warn("Skipping row {}: Question text is empty", rowNum);
                    continue;
                }

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

                String topic = getCellValue(row, 10);
                q.setTopic(topic != null && !topic.isBlank() ? topic : "general");

                questions.add(q);
            }

            if (examCode == null || questions.isEmpty()) {
                throw new RuntimeException("No valid questions found in the Excel file.");
            }

            final String finalExamCode = examCode;
            Exam exam = examRepository.findByExamCode(finalExamCode)
                    .orElseThrow(() -> new RuntimeException("Exam with code '" + finalExamCode + "' not found in database."));

            questionRepository.saveAll(questions);

            exam.setMcqCount(exam.getMcqCount() + mcq);
            exam.setCodingCount(exam.getCodingCount() + coding);
            exam.setDescriptiveCount(exam.getDescriptiveCount() + descriptive);
            exam.setQuestionsUploaded(true);
            exam.setStatus(ExamStatus.QUESTIONS_UPLOADED);

            examRepository.save(exam);
            logger.info("Successfully uploaded {} questions for exam code: {}", questions.size(), examCode);
        } catch (Exception e) {
            logger.error("Error during Excel upload: {}", e.getMessage(), e);
            throw e;
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
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