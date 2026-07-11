package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DriverSeasonStatsDto {
    Long driverId;
    Integer seasonYear;
    long racesEntered;
    BigDecimal points;
    long wins;
    long podiums;
    Double averageFinish;
    long polePositions;
    long dnfs;
}
