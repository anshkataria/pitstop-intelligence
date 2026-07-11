package com.pitstop.backend.service;

import com.pitstop.backend.dto.*;
import com.pitstop.backend.entity.Race;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.RaceMapper;
import com.pitstop.backend.repository.RaceRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PredictionContextService {
    private final RaceRepository raceRepository;
    private final RaceResultRepository resultRepository;
    private final RaceMapper raceMapper;

    public PredictionContextDto getContext(Integer season, Integer round) {
        Race race = raceRepository.findBySeasonYearAndRound(season, round)
                .orElseThrow(() -> new ResourceNotFoundException("Race", "season/round", season + "/" + round));
        var entries = resultRepository.findByRaceSeasonYearAndRaceRoundOrderByGridPositionAsc(season, round)
                .stream().filter(result -> result.getGridPosition() != null)
                .map(result -> PredictionContextEntryDto.builder()
                        .driverId(result.getDriver().getId()).driverRef(result.getDriver().getDriverRef())
                        .driverName(result.getDriver().getFirstName() + " " + result.getDriver().getLastName())
                        .driverNationality(result.getDriver().getNationality())
                        .constructorId(result.getConstructor().getId()).constructorRef(result.getConstructor().getConstructorRef())
                        .constructorName(result.getConstructor().getName())
                        .constructorNationality(result.getConstructor().getNationality())
                        .gridPosition(result.getGridPosition()).build())
                .toList();
        return PredictionContextDto.builder().race(raceMapper.toDto(race)).entries(entries).build();
    }
}
