package com.pitstop.backend.service;

import com.pitstop.backend.dto.DashboardSummaryDto;
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
public class DashboardService {
    private final RaceRepository raceRepository;
    private final RaceResultRepository resultRepository;
    private final RaceMapper raceMapper;
    private final RaceResultService raceResultService;

    public DashboardSummaryDto getSummary(Integer season, Integer round) {
        if (round == null) return getSeasonSummary(season);
        Race race = raceRepository.findBySeasonYearAndRound(season, round)
            .orElseThrow(() -> new ResourceNotFoundException("Race", "season/round", season + "/" + round));
        return buildRaceSummary(race);
    }

    public DashboardSummaryDto getSeasonSummary(Integer year) {
        Race latestRace = resultRepository.findTopByRaceSeasonYearOrderByRaceRoundDesc(year)
            .map(result -> result.getRace())
            .orElseGet(() -> raceRepository.findTopBySeasonYearOrderByRoundDesc(year)
                .orElseThrow(() -> new ResourceNotFoundException("Race", "season", year)));

        var seasonResults = resultRepository.findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(year);
        var latestClassification = resultRepository.findByRaceIdOrderByFinishPositionAsc(latestRace.getId());
        return DashboardSummaryDto.builder()
            .seasonYear(year)
            .race(raceMapper.toDto(latestRace))
            .classification(latestClassification.stream().map(raceResultService::toDto).toList())
            .driverCount(seasonResults.stream().map(result -> result.getDriver().getId()).distinct().count())
            .raceCount(raceRepository.findBySeasonYearOrderByRoundAsc(year).size())
            .resultCount(seasonResults.size())
            .build();
    }

    public DashboardSummaryDto getRaceSummary(Long raceId) {
        Race race = raceRepository.findById(raceId)
            .orElseThrow(() -> new ResourceNotFoundException("Race", "id", raceId));
        return buildRaceSummary(race);
    }

    private DashboardSummaryDto buildRaceSummary(Race race) {
        var results = resultRepository.findByRaceIdOrderByFinishPositionAsc(race.getId());
        return DashboardSummaryDto.builder()
                .seasonYear(race.getSeason().getYear())
                .race(raceMapper.toDto(race))
                .classification(results.stream().map(raceResultService::toDto).toList())
                .driverCount(results.stream().map(result -> result.getDriver().getId()).distinct().count())
                .raceCount(1)
                .resultCount(results.size())
                .build();
    }
}
