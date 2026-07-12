package com.pitstop.backend.dto.auth;

public record UserResponse(Long id, String email, String displayName, String role) {}
