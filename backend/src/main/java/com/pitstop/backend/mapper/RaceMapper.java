package com.pitstop.backend.mapper;

import com.pitstop.backend.dto.RaceDto;
import com.pitstop.backend.entity.Race;
import org.springframework.stereotype.Component;

@Component
public class RaceMapper {

    public RaceDto toDto(Race race) {
        return RaceDto.builder()
                .id(race.getId())
                .seasonYear(race.getSeason().getYear())
                .round(race.getRound())
                .name(race.getName())
                .circuitName(race.getCircuitName())
                .country(race.getCountry())
                .raceDate(race.getRaceDate())
                .build();
    }
}