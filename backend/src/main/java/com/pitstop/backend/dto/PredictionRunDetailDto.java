package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class PredictionRunDetailDto {
    Long id;
    Integer seasonYear;
    Integer round;
    String circuitName;
    String modelVersion;
    Instant createdAt;
    List<PredictionHistoryResultDto> results;
}
