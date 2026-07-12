package com.pitstop.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey signingKey;
    private final long accessTokenSeconds;

    public JwtService(
        @Value("${security.jwt.secret}") String secret,
        @Value("${security.jwt.access-token-seconds:900}") long accessTokenSeconds
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenSeconds = accessTokenSeconds;
    }

    public String generateAccessToken(UserDetails user) {
        Instant now = Instant.now();
        String role = user.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_USER");
        return Jwts.builder()
            .subject(user.getUsername())
            .claim("role", role)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(accessTokenSeconds)))
            .signWith(signingKey)
            .compact();
    }

    public String extractSubject(String token) {
        return claims(token).getSubject();
    }

    public boolean isValid(String token, UserDetails user) {
        Claims claims = claims(token);
        return claims.getSubject().equals(user.getUsername()) && claims.getExpiration().after(new Date());
    }

    public long accessTokenSeconds() {
        return accessTokenSeconds;
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }
}
