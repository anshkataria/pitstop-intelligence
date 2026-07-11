package com.pitstop.backend.controller;

import com.pitstop.backend.config.SecurityConfig;
import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.dto.PagedResponse;
import com.pitstop.backend.service.DriverService;
import com.pitstop.backend.service.RaceResultService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DriverController.class)
@Import(SecurityConfig.class)
class DriverControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DriverService driverService;

    @MockitoBean
    private RaceResultService raceResultService;

    @Test
    @DisplayName("GET /api/v1/drivers returns 200 with paged response")
    void getAllDrivers_returns200() throws Exception {
        DriverDto driver = DriverDto.builder()
                .id(1L)
                .driverRef("hamilton")
                .firstName("Lewis")
                .lastName("Hamilton")
                .fullName("Lewis Hamilton")
                .nationality("British")
                .dateOfBirth(LocalDate.of(1985, 1, 7))
                .build();

        PagedResponse<DriverDto> response = PagedResponse.<DriverDto>builder()
                .content(List.of(driver))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();

        when(driverService.findAll(anyInt(), anyInt())).thenReturn(response);

        mockMvc.perform(get("/v1/drivers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].driverRef").value("hamilton"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/drivers/{id} returns 200 for known driver")
    void getDriverById_returns200() throws Exception {
        DriverDto driver = DriverDto.builder()
                .id(1L)
                .driverRef("hamilton")
                .firstName("Lewis")
                .lastName("Hamilton")
                .fullName("Lewis Hamilton")
                .nationality("British")
                .build();

        when(driverService.findById(1L)).thenReturn(driver);

        mockMvc.perform(get("/v1/drivers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.driverRef").value("hamilton"))
                .andExpect(jsonPath("$.fullName").value("Lewis Hamilton"));
    }
}
