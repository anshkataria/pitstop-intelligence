package com.pitstop.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitstop.backend.config.SecurityConfig;
import com.pitstop.backend.security.AccountUserDetailsService;
import com.pitstop.backend.security.JwtService;
import com.pitstop.backend.service.MlProxyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MlProxyController.class)
@Import(SecurityConfig.class)
class MlProxyControllerTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean MlProxyService mlProxyService;
    @MockitoBean JwtService jwtService;
    @MockitoBean AccountUserDetailsService accountUserDetailsService;

    @Test
    @WithMockUser(roles = "USER")
    void rejectsTrainingForOrdinaryUsers() throws Exception {
        mockMvc.perform(post("/v1/ml/train")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());

        verify(mlProxyService, never()).train(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void allowsTrainingForAdministrators() throws Exception {
        var request = objectMapper.readTree("{}");
        when(mlProxyService.train(request))
            .thenReturn(objectMapper.readTree("{\"status\":\"success\"}"));

        mockMvc.perform(post("/v1/ml/train")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("success"));

        verify(mlProxyService).train(request);
    }
}
