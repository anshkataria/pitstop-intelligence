package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PredictionContextDto {
    RaceDto race;
    List<PredictionContextEntryDto> entries;
    boolean provisional;
}
