package com.pitstop.backend.service;

import com.pitstop.backend.dto.*;
import com.pitstop.backend.entity.PredictionResultRecord;
import com.pitstop.backend.entity.PredictionRun;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.repository.PredictionRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class PredictionHistoryService {
    private final PredictionRunRepository runs;

    public List<PredictionRunSummaryDto> latest(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return runs.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit)).stream()
            .map(this::summary).toList();
    }

    public PredictionRunDetailDto findById(Long id) {
        PredictionRun run = runs.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prediction run", "id", id));
        return PredictionRunDetailDto.builder()
            .id(run.getId()).seasonYear(run.getSeasonYear()).round(run.getRound())
            .circuitName(run.getCircuitName()).modelVersion(run.getModelVersion())
            .createdAt(run.getCreatedAt())
            .results(run.getResults().stream().map(this::result).toList()).build();
    }

    private PredictionRunSummaryDto summary(PredictionRun run) {
        return PredictionRunSummaryDto.builder().id(run.getId()).seasonYear(run.getSeasonYear())
            .round(run.getRound()).circuitName(run.getCircuitName()).modelVersion(run.getModelVersion())
            .createdAt(run.getCreatedAt()).resultCount(run.getResults().size()).build();
    }

    private PredictionHistoryResultDto result(PredictionResultRecord result) {
        return PredictionHistoryResultDto.builder().driverRef(result.getDriverRef())
            .constructorRef(result.getConstructorRef()).gridPosition(result.getGridPosition())
            .predictedPosition(result.getPredictedPosition())
            .predictedPositionRounded(result.getPredictedPositionRounded())
            .confidenceRangeLow(result.getConfidenceRangeLow())
            .confidenceRangeHigh(result.getConfidenceRangeHigh()).build();
    }
}
