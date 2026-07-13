package com.pitstop.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void hidesAuthenticationFailureDetails() {
        var response = handler.handleAuthentication(new BadCredentialsException("internal detail"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).containsEntry("message", "Invalid email or password");
    }

    @Test
    void preservesIntentionalResponseStatus() {
        var response = handler.handleResponseStatus(
            new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists")
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "Account already exists");
    }

    @Test
    void genericErrorsDoNotLeakInternalMessages() {
        var response = handler.handleGeneric(new RuntimeException("database password leaked"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).containsEntry("message", "An unexpected error occurred");
    }
}
