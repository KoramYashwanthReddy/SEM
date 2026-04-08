# AI Exam System

## Overview
AI Exam System is a Spring Boot-based enterprise exam management platform that supports role-based access for Admins, Teachers, and Students. The system combines secure authentication, AI-assisted proctoring, rich exam lifecycle management, reporting, and notifications into a single modular application.

## Key Features

### 1. Role-Based Access and Identity Management
- Admin, Teacher, Student roles with distinct dashboard and functional access.
- JSON Web Token (JWT) based authentication and authorization.
- Spring Security integration for secure session handling.
- Sign-up, login, password reset, and registration verification.
- Email-based workflows for account verification, password recovery, and notifications.

### 2. Exam Lifecycle Management
- Question CRUD operations via REST controllers.
- Exam creation, scheduling, and student assignment.
- Excel-based question upload support for bulk import.
- Exam attempt tracking and evaluation.
- Student exam navigation and progress handling.
- Multiple exam-related controllers supporting teacher and student workflows.

### 3. AI & Proctoring
- AI-driven exam monitoring via dedicated AI analysis controllers and services.
- Face detection and audio analysis for automated proctoring.
- Cheating detection and evidence capture logic.
- Proctoring event capture through WebSocket alerts and event persistence.
- Real-time monitoring support for live exam integrity.

### 4. Analytics and Reporting
- Dashboard analytics for admins, teachers, and students.
- Leaderboard generation and performance ranking.
- Certificate issuance and PDF generation for completed exams.
- Home summary and analytics controllers to support enterprise reporting.

### 5. Notification and Communication
- Notification management for admins, teachers, and students.
- WebSocket alerting service for live messaging and exam events.
- Email notification service for critical account and exam events.

### 6. File Management and Media Support
- File upload controller for structured exam content and assets.
- Support for Excel question import using Apache POI.
- PDF generation support via OpenPDF.
- File storage paths for snapshots, audio recordings, and logs.
- QR code support using ZXing for secure exam access or verification.

### 7. Monitoring and Operations
- Spring Boot Actuator included for application health and metrics.
- Hibernate SQL logging and detailed persistence diagnostics.
- Structured logging configuration with INFO/DEBUG levels.
- Redis-ready configuration for caching or session management.

## Architecture
The application follows a layered architecture:
- `controller/` — REST and page controllers for web, API, and UI flows.
- `service/` — business logic, AI analysis, exam scoring, notifications, and file handling.
- `repository/` — Spring Data JPA repositories for persistent domain access.
- `entity/` and `dto/` — domain entities and transfer objects.
- `security/` — authentication, authorization, JWT utilities, and security configuration.
- `utils/` — reusable helpers, file storage utilities, and common helpers.
- `static/` — web UI assets, pages, and SPA resources served by Spring Boot.

## Technology Stack
- Java 17
- Spring Boot 3.5.x
- Spring Security
- Spring Data JPA / Hibernate
- Spring Web, Spring WebSocket
- Spring Boot Actuator
- Spring Boot Mail
- Spring Data Redis
- MySQL
- JWT via JJWT
- Apache POI for Excel processing
- OpenPDF for PDF generation
- ZXing for QR code generation
- OpenCV for image/video analysis
- Lombok for boilerplate reduction

## Deployment and Setup

### Prerequisites
- Java 17 SDK
- Apache Maven
- MySQL database
- Redis server (optional for extended caching/session use)
- SMTP mail server for email workflows

### Local Run
1. Update `src/main/resources/application.properties` with your environment details.
2. Ensure MySQL is available and the JDBC URL is configured.
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```
4. Access the application at `http://localhost:8080`.

### Recommended Production Hardening
- Externalize all secrets and credentials using environment variables or a vault.
- Replace the hard-coded JWT secrets in `application.properties`.
- Use a managed SMTP service or environment-specific mail credentials.
- Enable HTTPS and secure cookies in production.
- Configure MySQL and Redis for high availability.
- Add CI/CD pipelines for build, test, and deployment automation.

## Configuration Notes
The application currently defines several runtime properties in `src/main/resources/application.properties`:
- `server.port`
- MySQL datasource settings
- JPA/Hibernate settings
- JWT secret and expiration values
- Redis host and port
- Multipart file upload limits
- Mail server properties
- File storage base paths for snapshots, audio, and logs
- Frontend reset URL

> Note: For enterprise use, do not commit production secrets. Move all sensitive values to environment-specific configuration.

## Important Paths
- `src/main/java/com/yashwanth/ai_exam_system/controller`
- `src/main/java/com/yashwanth/ai_exam_system/service`
- `src/main/java/com/yashwanth/ai_exam_system/repository`
- `src/main/resources/static` — frontend assets and HTML pages
- `src/main/resources/application.properties`

## Recommended Enhancements
- Add Docker support and container orchestration manifests.
- Add a production-ready database migration tool like Flyway or Liquibase.
- Add unit/integration tests for service and controller logic.
- Add API documentation with Swagger / OpenAPI.
- Add centralized observability and tracing.

## Summary
This repository is a full-stack enterprise exam management system with robust authentication, AI-enabled proctoring, multi-role dashboards, exam lifecycle management, notifications, and rich analytics. The layered Spring Boot architecture supports extension and production hardening while providing a clear foundation for scaling to a larger enterprise deployment.
