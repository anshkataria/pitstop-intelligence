package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PredictionEvaluationResultDto {
    String driverRef;
    Integer predictedPosition;
    Integer actualPosition;
    BigDecimal absoluteError;
    Boolean exactMatch;
    Boolean withinConfidenceRange;
}
