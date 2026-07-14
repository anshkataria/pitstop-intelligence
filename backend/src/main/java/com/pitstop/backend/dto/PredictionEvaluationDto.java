package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PredictionEvaluationDto {
    Long predictionRunId;
    String status;
    Integer predictionCount;
    Integer evaluatedCount;
    BigDecimal meanAbsoluteError;
    BigDecimal rootMeanSquaredError;
    BigDecimal exactMatchRate;
    BigDecimal confidenceCoverage;
    List<PredictionEvaluationResultDto> results;
}
