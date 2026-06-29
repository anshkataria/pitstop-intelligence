package com.pitstop.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.time.LocalDate;

@Data
@Builder
public class RaceDto {

    Long id;
    Integer seasonYear;
    Integer round;
    String name;
    String circuitName;
    String country;

    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate raceDate;
}