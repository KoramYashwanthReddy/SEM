package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // ================= AUTH =================

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    // ================= TEACHER =================

    boolean existsByEmployeeId(String employeeId);

    Optional<User> findByEmployeeId(String employeeId);

    Optional<User> findByEmployeeIdIgnoreCase(String employeeId);

    List<User> findByRole(Role role);

    Page<User> findByRole(Role role, Pageable pageable);

    // ================= ACTIVE / LOCKED =================

    List<User> findByEnabled(boolean enabled);

    List<User> findByAccountNonLocked(boolean accountNonLocked);

    // ================= ANALYTICS =================

    long countByRole(Role role);

    long countByEnabled(boolean enabled);

    // ================= SEARCH =================

    List<User> findByNameContainingIgnoreCase(String name);

    List<User> findByDepartment(String department);

    List<User> findByRoleAndEnabled(Role role, boolean enabled);

    // ================= TEACHER FILTER =================

    List<User> findByRoleAndDepartment(Role role, String department);

    List<User> findByRoleAndDesignation(Role role, String designation);

}
