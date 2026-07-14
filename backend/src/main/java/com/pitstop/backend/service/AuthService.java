package com.pitstop.backend.service;

import com.pitstop.backend.dto.auth.*;
import com.pitstop.backend.entity.RefreshToken;
import com.pitstop.backend.entity.UserAccount;
import com.pitstop.backend.repository.RefreshTokenRepository;
import com.pitstop.backend.repository.UserAccountRepository;
import com.pitstop.backend.security.AccountUserDetailsService;
import com.pitstop.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserAccountRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AccountUserDetailsService userDetailsService;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalise(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(CONFLICT, "An account already exists for this email");
        }
        Instant now = Instant.now();
        UserAccount account = users.save(UserAccount.builder()
            .email(email)
            .displayName(request.displayName().trim())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role("USER")
            .enabled(true)
            .createdAt(now)
            .updatedAt(now)
            .build());
        return issueSession(account);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalise(request.email());
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        UserAccount account = users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid email or password"));
        return issueSession(account);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken existing = activeToken(request.refreshToken());
        existing.setRevokedAt(Instant.now());
        return issueSession(existing.getUser());
    }

    @Transactional
    public void logout(RefreshRequest request) {
        refreshTokens.findByTokenHash(hash(request.refreshToken()))
            .filter(token -> token.getRevokedAt() == null)
            .ifPresent(token -> token.setRevokedAt(Instant.now()));
    }

    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return users.findByEmailIgnoreCase(email).map(this::toUser)
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Account is no longer available"));
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        UserAccount account = account(email);
        account.setDisplayName(request.displayName().trim());
        account.setUpdatedAt(Instant.now());
        return toUser(account);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        UserAccount account = account(email);
        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(BAD_REQUEST, "Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(BAD_REQUEST, "New password must be different");
        }
        account.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        account.setUpdatedAt(Instant.now());
        Instant revokedAt = Instant.now();
        refreshTokens.findAllByUserIdAndRevokedAtIsNull(account.getId())
            .forEach(token -> token.setRevokedAt(revokedAt));
    }

    private AuthResponse issueSession(UserAccount account) {
        UserDetails details = userDetailsService.loadUserByUsername(account.getEmail());
        String plainRefreshToken = newRefreshToken();
        refreshTokens.save(RefreshToken.builder()
            .user(account)
            .tokenHash(hash(plainRefreshToken))
            .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
            .createdAt(Instant.now())
            .build());
        return new AuthResponse(
            jwtService.generateAccessToken(details),
            plainRefreshToken,
            jwtService.accessTokenSeconds(),
            toUser(account)
        );
    }

    private RefreshToken activeToken(String plainToken) {
        RefreshToken token = refreshTokens.findByTokenHash(hash(plainToken))
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Refresh token is invalid"));
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token has expired");
        }
        return token;
    }

    private UserResponse toUser(UserAccount account) {
        return new UserResponse(account.getId(), account.getEmail(), account.getDisplayName(), account.getRole());
    }

    private UserAccount account(String email) {
        return users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Account is no longer available"));
    }

    private static String normalise(String email) {
        return email.trim().toLowerCase();
    }

    private static String newRefreshToken() {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
