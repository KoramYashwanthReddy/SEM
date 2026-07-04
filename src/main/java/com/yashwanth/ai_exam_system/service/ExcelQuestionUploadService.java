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

import java.util.stream.Collectors;

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
            Row headerRow = rows.hasNext() ? rows.next() : null;
            Map<String, Integer> headerMap = buildHeaderMap(headerRow);

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

                String code = getCellValue(row, headerMap, 0, "examcode", "exam code", "code");
                if (code == null || code.isBlank()) {
                    logger.warn("Skipping row {}: Exam code is empty", rowNum);
                    continue;
                }

                if (examCode == null) {
                    examCode = code;
                } else if (!examCode.equalsIgnoreCase(code)) {
                    throw new RuntimeException("Multiple exam codes found in file at row " + rowNum + ". Expected: " + examCode + ", Found: " + code);
                }

                String typeStr = getCellValue(row, headerMap, 1, "questiontype", "question type", "type");
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

                String questionText = getCellValue(row, headerMap, 3, "questiontext", "question text", "question", "prompt");
                if (questionText == null || questionText.isBlank()) {
                    logger.warn("Skipping row {}: Question text is empty", rowNum);
                    continue;
                }

                Question q = new Question();
                q.setExamCode(examCode);
                q.setQuestionType(type);
                q.setDifficulty(getCellValue(row, headerMap, 2, "difficulty", "level"));
                q.setQuestionText(questionText);

                if (type == QuestionType.MCQ) {
                    List<String> options = readQuestionOptions(row, headerMap);
                    q.setOptionA(optionAt(options, 0));
                    q.setOptionB(optionAt(options, 1));
                    q.setOptionC(optionAt(options, 2));
                    q.setOptionD(optionAt(options, 3));
                    q.setOptionE(optionAt(options, 4));
                    q.setOptionF(optionAt(options, 5));
                    q.setCorrectAnswer(getCellValue(row, headerMap, 8, "correctanswer", "correct answer", "answer", "correct"));
                    q.setShuffleOptions(options.stream().filter(option -> option != null && !option.isBlank()).count() > 4);
                    mcq++;
                } else if (type == QuestionType.CODING) {
                    q.setSampleInput(getCellValue(row, headerMap, 4, "sampleinput", "sample input", "input"));
                    q.setSampleOutput(getCellValue(row, headerMap, 5, "sampleoutput", "sample output", "output"));
                    coding++;
                } else {
                    descriptive++;
                }

                q.setMarks((int) getNumericValue(row, headerMap, 9, "marks", "mark", "score"));

                String topic = getCellValue(row, headerMap, 10, "topic", "section", "subject");
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


    private Map<String, Integer> buildHeaderMap(Row headerRow) {
        Map<String, Integer> headerMap = new HashMap<>();
        if (headerRow == null) {
            return headerMap;
        }
        for (int c = headerRow.getFirstCellNum(); c < headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c);
            String header = normalizeHeader(cell == null ? null : cell.toString());
            if (!header.isBlank() && !headerMap.containsKey(header)) {
                headerMap.put(header, c);
            }
        }
        return headerMap;
    }

    private List<String> readQuestionOptions(Row row, Map<String, Integer> headerMap) {
        List<String> options = new ArrayList<>();
        String[] headerKeys = {
                "optiona", "optionb", "optionc", "optiond", "optione", "optionf"
        };
        boolean hasNamedOptions = false;
        for (String key : headerKeys) {
            if (headerMap.containsKey(key)) {
                hasNamedOptions = true;
                break;
            }
        }

        if (hasNamedOptions) {
            options.add(getCellValue(row, headerMap, 4, "optiona", "option a", "a", "opt_a"));
            options.add(getCellValue(row, headerMap, 5, "optionb", "option b", "b", "opt_b"));
            options.add(getCellValue(row, headerMap, 6, "optionc", "option c", "c", "opt_c"));
            options.add(getCellValue(row, headerMap, 7, "optiond", "option d", "d", "opt_d"));
            options.add(getCellValue(row, headerMap, 8, "optione", "option e", "e", "opt_e"));
            options.add(getCellValue(row, headerMap, 9, "optionf", "option f", "f", "opt_f"));
            return options.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .collect(Collectors.toCollection(ArrayList::new));
        }

        String optionA = getCellValue(row, 4);
        String optionB = getCellValue(row, 5);
        String optionC = getCellValue(row, 6);
        String optionD = getCellValue(row, 7);
        if (optionA != null && !optionA.isBlank()) options.add(optionA);
        if (optionB != null && !optionB.isBlank()) options.add(optionB);
        if (optionC != null && !optionC.isBlank()) options.add(optionC);
        if (optionD != null && !optionD.isBlank()) options.add(optionD);
        return options;
    }

    private String optionAt(List<String> options, int index) {
        if (index < 0 || index >= options.size()) {
            return null;
        }
        String value = options.get(index);
        return value == null || value.isBlank() ? null : value;
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

    private String getCellValue(Row row, Map<String, Integer> headerMap, int fallbackIndex, String... headers) {
        if (headerMap != null && !headerMap.isEmpty()) {
            for (String header : headers) {
                Integer index = headerMap.get(normalizeHeader(header));
                if (index != null) {
                    String value = getCellValue(row, index);
                    if (value != null && !value.isBlank()) {
                        return value;
                    }
                }
            }
        }
        return getCellValue(row, fallbackIndex);
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

    private double getNumericValue(Row row, Map<String, Integer> headerMap, int fallbackIndex, String... headers) {
        if (headerMap != null && !headerMap.isEmpty()) {
            for (String header : headers) {
                Integer index = headerMap.get(normalizeHeader(header));
                if (index != null) {
                    double value = getNumericValue(row, index);
                    if (value != 0) {
                        return value;
                    }
                }
            }
        }
        return getNumericValue(row, fallbackIndex);
    }

    private String normalizeHeader(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
