package com.pitstop.backend.controller;

import com.pitstop.backend.dto.PredictionContextDto;
import com.pitstop.backend.service.PredictionContextService;
import com.pitstop.backend.dto.PredictionRunDetailDto;
import com.pitstop.backend.dto.PredictionRunSummaryDto;
import com.pitstop.backend.service.PredictionHistoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/predictions")
@RequiredArgsConstructor
public class PredictionContextController {
    private final PredictionContextService service;
    private final PredictionHistoryService historyService;

    @GetMapping("/context")
    public ResponseEntity<PredictionContextDto> getContext(
            @RequestParam Integer season, @RequestParam Integer round) {
        return ResponseEntity.ok(service.getContext(season, round));
    }

    @GetMapping("/history")
    public ResponseEntity<List<PredictionRunSummaryDto>> history(
            @RequestParam(defaultValue = "25") int limit) {
        return ResponseEntity.ok(historyService.latest(limit));
    }

    @GetMapping("/history/{id}")
    public ResponseEntity<PredictionRunDetailDto> historyDetail(@PathVariable Long id) {
        return ResponseEntity.ok(historyService.findById(id));
    }
}
