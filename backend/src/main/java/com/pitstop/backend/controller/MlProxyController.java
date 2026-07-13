package com.pitstop.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.pitstop.backend.service.MlProxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/ml")
@RequiredArgsConstructor
public class MlProxyController {
    private final MlProxyService mlProxyService;

    @GetMapping("/health")
    public JsonNode health() {
        return mlProxyService.health();
    }

    @PostMapping("/predict")
    public JsonNode predict(@RequestBody JsonNode request) {
        return mlProxyService.predict(request);
    }

    @PostMapping("/train")
    public JsonNode train(@RequestBody JsonNode request) {
        return mlProxyService.train(request);
    }
}
