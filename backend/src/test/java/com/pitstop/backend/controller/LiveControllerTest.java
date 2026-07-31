package com.pitstop.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitstop.backend.config.SecurityConfig;
import com.pitstop.backend.security.AccountUserDetailsService;
import com.pitstop.backend.security.JwtService;
import com.pitstop.backend.service.LiveReplayService;
import com.pitstop.backend.service.LiveTelemetryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LiveController.class)
@Import(SecurityConfig.class)
class LiveControllerTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean LiveTelemetryService service;
    @MockitoBean LiveReplayService replayService;
    @MockitoBean JwtService jwtService;
    @MockitoBean AccountUserDetailsService userDetailsService;

    @Test
    @WithMockUser
    void returnsAvailableLiveSessions() throws Exception {
        when(service.sessions()).thenReturn(List.of(java.util.Map.of("sessionKey", "9839")));
        mockMvc.perform(get("/v1/live/sessions"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].sessionKey").value("9839"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void ordinaryUsersCannotStartFastF1Replay() throws Exception {
        mockMvc.perform(post("/v1/live/replay").contentType("application/json")
                .content("{\"year\":2024,\"event\":\"Bahrain\",\"session\":\"R\"}"))
            .andExpect(status().isForbidden());
        verify(replayService, never()).start(any());
    }

    @Test
    @WithMockUser
    void returnsReplayStatusForAnyAuthenticatedUser() throws Exception {
        when(replayService.status()).thenReturn(objectMapper.readTree("{\"state\":\"SUCCEEDED\"}"));
        mockMvc.perform(get("/v1/live/replay/status"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SUCCEEDED"));
    }
}
