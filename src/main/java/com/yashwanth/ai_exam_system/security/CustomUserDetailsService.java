package com.yashwanth.ai_exam_system.security;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .disabled(!user.isEnabled())
                .accountLocked(!user.isAccountNonLocked())
                .roles(user.getRole().name())
                .build();
    }
}
