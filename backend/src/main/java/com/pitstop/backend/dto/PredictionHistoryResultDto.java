package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data @Builder
public class PredictionHistoryResultDto {
    String driverRef;
    String constructorRef;
    Integer gridPosition;
    BigDecimal predictedPosition;
    Integer predictedPositionRounded;
    Integer confidenceRangeLow;
    Integer confidenceRangeHigh;
}
