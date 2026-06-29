package com.yashwanth.ai_exam_system;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.yashwanth.ai_exam_system.dto.CreateTeacherRequest;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.AdminService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiExamSystemApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminService adminService;

    @Test
    void contextLoads() {
        assertThat(userRepository).isNotNull();
    }

    @Test
    void seedsDemoUsersForAllPrimaryRoles() {
        User admin = userRepository.findByEmailIgnoreCase("admin@ai-exam.local").orElseThrow();
        User teacher = userRepository.findByEmailIgnoreCase("teacher@ai-exam.local").orElseThrow();
        User student = userRepository.findByEmailIgnoreCase("student@ai-exam.local").orElseThrow();

        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(teacher.getRole()).isEqualTo(Role.TEACHER);
        assertThat(teacher.getEmployeeId()).isEqualTo("TCH-1001");
        assertThat(student.getRole()).isEqualTo(Role.STUDENT);
    }

    @Test
    void loginWorksForStudentDemoUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "student@ai-exam.local",
                                  "password": "Student@123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"))
                .andExpect(jsonPath("$.data.email").value("student@ai-exam.local"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void loginWorksForTeacherUsingEmployeeId() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "TCH-1001",
                                  "password": "Teacher@123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.role").value("TEACHER"))
                .andExpect(jsonPath("$.data.employeeId").value("TCH-1001"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void loginWorksForAdminDemoUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "admin@ai-exam.local",
                                  "password": "Admin@123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.email").value("admin@ai-exam.local"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void loginRejectsUnknownUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "missing@ai-exam.local",
                                  "password": "SomePassword123"
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }
    @Test
    void createTeacherWithMultipartProfileImageWorks() {
        CreateTeacherRequest request = new CreateTeacherRequest();
        request.setFullName("Multipart Teacher");
        request.setEmail("multipart.teacher@ai-exam.local");
        request.setPassword("Teacher@123456");
        request.setPhone("7396339051");
        request.setDepartment("Computer science and Engg");
        request.setDesignation("Senior lecture");
        request.setExperienceYears(3);
        request.setQualification("Ph.D in computer science and Engg");
        request.setEmployeeId("TCH-MULTI-1001");

        MockMultipartFile profileImage = new MockMultipartFile(
                "profileImage",
                "profile.png",
                MediaType.IMAGE_PNG_VALUE,
                "fake-image-content".getBytes());

        java.util.Map<String, Object> response = adminService.createTeacher(request, profileImage);

        assertThat(response.get("success")).isEqualTo(true);
        User teacher = userRepository.findByEmailIgnoreCase("multipart.teacher@ai-exam.local").orElseThrow();
        assertThat(teacher.getRole()).isEqualTo(Role.TEACHER);
        assertThat(teacher.getPhone()).isEqualTo("7396339051");
        assertThat(teacher.getEmployeeId()).isEqualTo("TCH-MULTI-1001");
        assertThat(teacher.getProfileImage()).startsWith("data:image/png;base64,");
    }
}


