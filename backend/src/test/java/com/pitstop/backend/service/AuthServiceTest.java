package com.pitstop.backend.service;

import com.pitstop.backend.dto.auth.*;
import com.pitstop.backend.entity.RefreshToken;
import com.pitstop.backend.entity.UserAccount;
import com.pitstop.backend.repository.RefreshTokenRepository;
import com.pitstop.backend.repository.UserAccountRepository;
import com.pitstop.backend.security.AccountUserDetailsService;
import com.pitstop.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserAccountRepository users;
    @Mock RefreshTokenRepository refreshTokens;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock AccountUserDetailsService userDetailsService;
    @Mock JwtService jwtService;
    @InjectMocks AuthService authService;

    @Test
    void registrationNormalisesEmailHashesPasswordAndIssuesSession() {
        when(users.existsByEmailIgnoreCase("engineer@pitstop.test")).thenReturn(false);
        when(passwordEncoder.encode("racepace123")).thenReturn("bcrypt-hash");
        when(users.save(any())).thenAnswer(invocation -> {
            UserAccount account = invocation.getArgument(0);
            account.setId(12L);
            return account;
        });
        var details = User.withUsername("engineer@pitstop.test").password("bcrypt-hash").roles("USER").build();
        when(userDetailsService.loadUserByUsername("engineer@pitstop.test")).thenReturn(details);
        when(jwtService.generateAccessToken(details)).thenReturn("access-token");
        when(jwtService.accessTokenSeconds()).thenReturn(900L);

        AuthResponse response = authService.register(
            new RegisterRequest("Race Engineer", " Engineer@Pitstop.Test ", "racepace123")
        );

        ArgumentCaptor<UserAccount> account = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).save(account.capture());
        assertThat(account.getValue().getEmail()).isEqualTo("engineer@pitstop.test");
        assertThat(account.getValue().getPasswordHash()).isEqualTo("bcrypt-hash");
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isNotBlank();
        verify(refreshTokens).save(argThat(token -> token.getTokenHash().length() == 64));
    }

    @Test
    void registrationRejectsDuplicateEmail() {
        when(users.existsByEmailIgnoreCase("engineer@pitstop.test")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
            new RegisterRequest("Engineer", "engineer@pitstop.test", "racepace123")
        )).isInstanceOf(ResponseStatusException.class).hasMessageContaining("already exists");
        verifyNoInteractions(passwordEncoder, refreshTokens);
    }

    @Test
    void refreshRotatesExistingToken() {
        UserAccount account = UserAccount.builder().id(1L).email("engineer@pitstop.test")
            .displayName("Engineer").passwordHash("hash").role("USER").enabled(true).build();
        RefreshToken current = RefreshToken.builder().user(account).tokenHash("stored-hash")
            .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS)).createdAt(Instant.now()).build();
        when(refreshTokens.findByTokenHash(anyString())).thenReturn(Optional.of(current));
        var details = User.withUsername(account.getEmail()).password("hash").roles("USER").build();
        when(userDetailsService.loadUserByUsername(account.getEmail())).thenReturn(details);
        when(jwtService.generateAccessToken(details)).thenReturn("new-access-token");
        when(jwtService.accessTokenSeconds()).thenReturn(900L);

        AuthResponse response = authService.refresh(new RefreshRequest("plain-refresh-token"));

        assertThat(current.getRevokedAt()).isNotNull();
        assertThat(response.accessToken()).isEqualTo("new-access-token");
        verify(refreshTokens).save(argThat(token -> token != current && token.getUser() == account));
    }

    @Test
    void refreshRejectsExpiredToken() {
        RefreshToken expired = RefreshToken.builder().tokenHash("hash")
            .expiresAt(Instant.now().minusSeconds(1)).build();
        when(refreshTokens.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh(new RefreshRequest("expired")))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("expired");
    }
}
