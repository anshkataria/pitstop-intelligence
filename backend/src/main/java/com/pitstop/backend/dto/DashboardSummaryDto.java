package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DashboardSummaryDto {
    Integer seasonYear;
    RaceDto race;
    List<RaceResultDto> classification;
    long driverCount;
    long raceCount;
    long resultCount;
}
