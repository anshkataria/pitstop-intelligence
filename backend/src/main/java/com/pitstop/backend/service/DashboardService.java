package com.pitstop.backend.service;

import com.pitstop.backend.dto.DashboardSummaryDto;
import com.pitstop.backend.entity.Race;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.RaceMapper;
import com.pitstop.backend.repository.DriverRepository;
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
    private final DriverRepository driverRepository;
    private final RaceMapper raceMapper;
    private final RaceResultService raceResultService;

    public DashboardSummaryDto getSummary(Integer season, Integer round) {
        Race race = round == null
                ? resultRepository.findTopByRaceSeasonYearOrderByRaceRoundDesc(season)
                    .map(result -> result.getRace())
                    .orElseGet(() -> raceRepository.findTopBySeasonYearOrderByRoundDesc(season)
                        .orElseThrow(() -> new ResourceNotFoundException("Race", "season", season)))
                : raceRepository.findBySeasonYearAndRound(season, round)
                    .orElseThrow(() -> new ResourceNotFoundException("Race", "season/round", season + "/" + round));

        var results = resultRepository.findByRaceIdOrderByFinishPositionAsc(race.getId());
        return DashboardSummaryDto.builder()
                .seasonYear(season)
                .race(raceMapper.toDto(race))
                .classification(results.stream().map(raceResultService::toDto).toList())
                .driverCount(driverRepository.count())
                .raceCount(raceRepository.findBySeasonYearOrderByRoundAsc(season).size())
                .resultCount(results.size())
                .build();
    }
}
