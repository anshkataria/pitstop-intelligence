package com.pitstop.backend.security;

import com.pitstop.backend.entity.UserAccount;
import com.pitstop.backend.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountUserDetailsService implements UserDetailsService {
    private final UserAccountRepository users;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserAccount account = users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("Account not found"));
        return User.withUsername(account.getEmail())
            .password(account.getPasswordHash())
            .roles(account.getRole())
            .disabled(!account.isEnabled())
            .build();
    }
}
