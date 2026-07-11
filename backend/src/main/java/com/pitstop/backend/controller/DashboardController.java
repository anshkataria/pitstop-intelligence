package com.pitstop.backend.controller;

import com.pitstop.backend.dto.DashboardSummaryDto;
import com.pitstop.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardSummaryDto> getSummary(
            @RequestParam(defaultValue = "2024") Integer season,
            @RequestParam(required = false) Integer round) {
        return ResponseEntity.ok(dashboardService.getSummary(season, round));
    }
}
