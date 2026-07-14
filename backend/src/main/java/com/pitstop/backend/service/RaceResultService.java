package com.pitstop.backend.service;

import com.pitstop.backend.dto.DriverSeasonStatsDto;
import com.pitstop.backend.dto.RaceResultDto;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.repository.DriverRepository;
import com.pitstop.backend.repository.RaceRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RaceResultService {
    private final RaceResultRepository resultRepository;
    private final RaceRepository raceRepository;
    private final DriverRepository driverRepository;

    public List<RaceResultDto> findByRaceId(Long raceId) {
        if (!raceRepository.existsById(raceId)) throw new ResourceNotFoundException("Race", "id", raceId);
        return resultRepository.findByRaceIdOrderByFinishPositionAsc(raceId).stream().map(this::toDto).toList();
    }

    public List<RaceResultDto> findBySeasonAndRound(Integer year, Integer round) {
        if (raceRepository.findBySeasonYearAndRound(year, round).isEmpty()) {
            throw new ResourceNotFoundException("Race", "season/round", year + "/" + round);
        }
        return resultRepository.findByRaceSeasonYearAndRaceRoundOrderByFinishPositionAsc(year, round)
                .stream().map(this::toDto).toList();
    }

    public List<RaceResultDto> findBySeason(Integer year) {
        if (raceRepository.findBySeasonYearOrderByRoundAsc(year).isEmpty()) {
            throw new ResourceNotFoundException("Season results", "year", year);
        }
        return resultRepository.findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(year)
            .stream().map(this::toDto).toList();
    }

    public List<RaceResultDto> findDriverResults(Long driverId, Integer year) {
        if (!driverRepository.existsById(driverId)) throw new ResourceNotFoundException("Driver", "id", driverId);
        return resultRepository.findByDriverIdAndRaceSeasonYearOrderByRaceRoundAsc(driverId, year)
                .stream().map(this::toDto).toList();
    }

    public DriverSeasonStatsDto getDriverStats(Long driverId, Integer year) {
        List<RaceResult> results = resultRepository.findByDriverIdAndRaceSeasonYearOrderByRaceRoundAsc(driverId, year);
        if (!driverRepository.existsById(driverId)) throw new ResourceNotFoundException("Driver", "id", driverId);

        BigDecimal points = results.stream().map(r -> r.getPoints() == null ? BigDecimal.ZERO : r.getPoints())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Integer> finishes = results.stream().map(RaceResult::getFinishPosition).filter(p -> p != null).toList();
        Double average = finishes.isEmpty() ? null : finishes.stream().mapToInt(Integer::intValue).average().orElse(0);
        if (average != null) average = BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP).doubleValue();

        return DriverSeasonStatsDto.builder()
                .driverId(driverId).seasonYear(year).racesEntered(results.size()).points(points)
                .wins(finishes.stream().filter(p -> p == 1).count())
                .podiums(finishes.stream().filter(p -> p <= 3).count())
                .averageFinish(average)
                .polePositions(results.stream().filter(r -> Integer.valueOf(1).equals(r.getGridPosition())).count())
                .dnfs(results.stream().filter(this::isDnf).count())
                .build();
    }

    private boolean isDnf(RaceResult result) {
        String status = result.getStatus();
        return status != null && !status.equalsIgnoreCase("Finished") && !status.startsWith("+");
    }

    public RaceResultDto toDto(RaceResult result) {
        return RaceResultDto.builder()
                .id(result.getId()).raceId(result.getRace().getId())
                .seasonYear(result.getRace().getSeason().getYear()).round(result.getRace().getRound())
                .driverId(result.getDriver().getId()).driverRef(result.getDriver().getDriverRef())
                .driverName(result.getDriver().getFirstName() + " " + result.getDriver().getLastName())
                .constructorId(result.getConstructor().getId()).constructorRef(result.getConstructor().getConstructorRef())
                .constructorName(result.getConstructor().getName()).gridPosition(result.getGridPosition())
                .finishPosition(result.getFinishPosition()).points(result.getPoints()).status(result.getStatus()).build();
    }
}
