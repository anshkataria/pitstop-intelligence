package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class PredictionRunSummaryDto {
    Long id;
    Integer seasonYear;
    Integer round;
    String circuitName;
    String modelVersion;
    Instant createdAt;
    int resultCount;
}
