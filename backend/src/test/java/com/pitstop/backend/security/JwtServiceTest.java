package com.pitstop.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {
    private final JwtService jwtService = new JwtService(
        "a-test-secret-that-is-safely-longer-than-thirty-two-bytes",
        900
    );

    @Test
    void createsAndValidatesAccessToken() {
        var user = User.withUsername("engineer@pitstop.test")
            .password("unused")
            .roles("USER")
            .build();

        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.extractSubject(token)).isEqualTo(user.getUsername());
        assertThat(jwtService.isValid(token, user)).isTrue();
        assertThat(jwtService.accessTokenSeconds()).isEqualTo(900);
    }
}
