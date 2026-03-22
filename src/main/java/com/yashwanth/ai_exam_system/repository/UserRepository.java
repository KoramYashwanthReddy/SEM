package com.yashwanth.ai_exam_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // login
    Optional<User> findByEmail(String email);

    // duplicate check (faster)
    boolean existsByEmail(String email);

    // admin dashboard
    List<User> findByRole(Role role);

    // analytics
    long countByRole(Role role);

    // active users
    List<User> findByEnabled(boolean enabled);

    // locked users
    List<User> findByAccountNonLocked(boolean accountNonLocked);
}