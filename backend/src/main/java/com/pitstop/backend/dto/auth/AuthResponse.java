package com.pitstop.backend.dto.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    UserResponse user
) {}
