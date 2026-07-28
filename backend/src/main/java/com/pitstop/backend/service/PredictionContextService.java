package com.pitstop.backend.service;

import com.pitstop.backend.dto.*;
import com.pitstop.backend.entity.Race;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.RaceMapper;
import com.pitstop.backend.repository.RaceRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

        List<RaceResult> ownResults = resultRepository
                .findByRaceSeasonYearAndRaceRoundOrderByGridPositionAsc(season, round)
                .stream().filter(result -> result.getGridPosition() != null)
                .toList();

        // The race hasn't happened yet (or its grid isn't recorded), so there's no
        // starting grid to read. Fall back to the most recent completed race's
        // driver/constructor lineup as a default candidate grid the user can rearrange.
        boolean provisional = ownResults.isEmpty();
        List<RaceResult> source = provisional
                ? resultRepository.findMostRecentCompletedEntriesBefore(
                        race.getRaceDate() != null ? race.getRaceDate() : LocalDate.now())
                : ownResults;

        List<PredictionContextEntryDto> entries = new ArrayList<>();
        for (int i = 0; i < source.size(); i++) {
            RaceResult result = source.get(i);
            entries.add(toEntry(result, provisional ? i + 1 : result.getGridPosition()));
        }

        return PredictionContextDto.builder()
                .race(raceMapper.toDto(race))
                .entries(entries)
                .provisional(provisional)
                .build();
    }

    private PredictionContextEntryDto toEntry(RaceResult result, Integer gridPosition) {
        return PredictionContextEntryDto.builder()
                .driverId(result.getDriver().getId()).driverRef(result.getDriver().getDriverRef())
                .driverName(result.getDriver().getFirstName() + " " + result.getDriver().getLastName())
                .driverNationality(result.getDriver().getNationality())
                .constructorId(result.getConstructor().getId()).constructorRef(result.getConstructor().getConstructorRef())
                .constructorName(result.getConstructor().getName())
                .constructorNationality(result.getConstructor().getNationality())
                .gridPosition(gridPosition)
                .build();
    }
}
