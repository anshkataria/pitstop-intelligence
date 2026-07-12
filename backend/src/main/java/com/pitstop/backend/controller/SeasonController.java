package com.pitstop.backend.controller;

import com.pitstop.backend.service.SeasonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/seasons")
@RequiredArgsConstructor
public class SeasonController {
    private final SeasonService seasonService;

    @GetMapping
    public ResponseEntity<List<Integer>> getAll() {
        return ResponseEntity.ok(seasonService.findAllYears());
    }
}
