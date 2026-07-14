package com.pitstop.backend.service;

import com.pitstop.backend.dto.*;
import com.pitstop.backend.entity.PredictionResultRecord;
import com.pitstop.backend.entity.PredictionRun;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.repository.PredictionRunRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class PredictionHistoryService {
    private final PredictionRunRepository runs;
    private final RaceResultRepository raceResults;

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

    public PredictionEvaluationDto evaluate(Long id) {
        PredictionRun run = runs.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prediction run", "id", id));
        Map<String, RaceResult> actualByDriver = raceResults
            .findByRaceSeasonYearAndRaceRoundOrderByFinishPositionAsc(run.getSeasonYear(), run.getRound())
            .stream()
            .filter(result -> result.getFinishPosition() != null)
            .collect(Collectors.toMap(
                result -> result.getDriver().getDriverRef(),
                Function.identity(),
                (first, ignored) -> first
            ));

        List<PredictionEvaluationResultDto> evaluated = run.getResults().stream()
            .filter(prediction -> actualByDriver.containsKey(prediction.getDriverRef()))
            .map(prediction -> evaluationResult(prediction, actualByDriver.get(prediction.getDriverRef())))
            .toList();
        int predictionCount = run.getResults().size();
        int evaluatedCount = evaluated.size();

        return PredictionEvaluationDto.builder()
            .predictionRunId(run.getId())
            .status(evaluationStatus(predictionCount, evaluatedCount))
            .predictionCount(predictionCount)
            .evaluatedCount(evaluatedCount)
            .meanAbsoluteError(metric(evaluated, false))
            .rootMeanSquaredError(metric(evaluated, true))
            .exactMatchRate(rate(evaluated.stream().filter(PredictionEvaluationResultDto::getExactMatch).count(), evaluatedCount))
            .confidenceCoverage(rate(evaluated.stream().filter(PredictionEvaluationResultDto::getWithinConfidenceRange).count(), evaluatedCount))
            .results(evaluated)
            .build();
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

    private PredictionEvaluationResultDto evaluationResult(
        PredictionResultRecord prediction,
        RaceResult actual
    ) {
        BigDecimal actualPosition = BigDecimal.valueOf(actual.getFinishPosition());
        BigDecimal absoluteError = prediction.getPredictedPosition().subtract(actualPosition).abs()
            .setScale(2, RoundingMode.HALF_UP);
        boolean withinRange = actual.getFinishPosition() >= prediction.getConfidenceRangeLow()
            && actual.getFinishPosition() <= prediction.getConfidenceRangeHigh();
        return PredictionEvaluationResultDto.builder()
            .driverRef(prediction.getDriverRef())
            .predictedPosition(prediction.getPredictedPositionRounded())
            .actualPosition(actual.getFinishPosition())
            .absoluteError(absoluteError)
            .exactMatch(prediction.getPredictedPositionRounded().equals(actual.getFinishPosition()))
            .withinConfidenceRange(withinRange)
            .build();
    }

    private BigDecimal metric(List<PredictionEvaluationResultDto> evaluated, boolean squared) {
        if (evaluated.isEmpty()) return null;
        double average = evaluated.stream().mapToDouble(result -> {
            double error = result.getAbsoluteError().doubleValue();
            return squared ? error * error : error;
        }).average().orElse(0);
        double value = squared ? Math.sqrt(average) : average;
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal rate(long matches, int total) {
        if (total == 0) return null;
        return BigDecimal.valueOf(matches * 100.0 / total).setScale(1, RoundingMode.HALF_UP);
    }

    private String evaluationStatus(int predictionCount, int evaluatedCount) {
        if (evaluatedCount == 0) return "PENDING";
        return evaluatedCount == predictionCount ? "COMPLETE" : "PARTIAL";
    }
}
