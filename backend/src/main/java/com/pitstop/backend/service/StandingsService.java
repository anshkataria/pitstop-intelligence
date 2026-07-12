package com.pitstop.backend.service;

import com.pitstop.backend.dto.ConstructorStandingDto;
import com.pitstop.backend.dto.DriverStandingDto;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.repository.RaceResultRepository;
import com.pitstop.backend.repository.SeasonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StandingsService {
    private final RaceResultRepository results;
    private final SeasonRepository seasons;

    public List<DriverStandingDto> driverStandings(Integer season) {
        List<RaceResult> seasonResults = seasonResults(season);
        Map<Long, List<RaceResult>> byDriver = seasonResults.stream()
            .collect(Collectors.groupingBy(r -> r.getDriver().getId()));

        List<DriverStandingDto> standings = byDriver.values().stream().map(entries -> {
            RaceResult latest = entries.stream().max(Comparator.comparing(r -> r.getRace().getRound())).orElseThrow();
            return DriverStandingDto.builder()
                .driverId(latest.getDriver().getId())
                .driverRef(latest.getDriver().getDriverRef())
                .driverName(latest.getDriver().getFirstName() + " " + latest.getDriver().getLastName())
                .constructorId(latest.getConstructor().getId())
                .constructorName(latest.getConstructor().getName())
                .points(points(entries))
                .wins(finishes(entries, 1, 1))
                .podiums(finishes(entries, 1, 3))
                .racesEntered(entries.stream().map(r -> r.getRace().getId()).distinct().count())
                .build();
        }).sorted(Comparator.comparing(DriverStandingDto::getPoints).reversed()
            .thenComparing(DriverStandingDto::getWins, Comparator.reverseOrder())
            .thenComparing(DriverStandingDto::getDriverName)).toList();
        assignDriverPositions(standings);
        return standings;
    }

    public List<ConstructorStandingDto> constructorStandings(Integer season) {
        List<RaceResult> seasonResults = seasonResults(season);
        Map<Long, List<RaceResult>> byConstructor = seasonResults.stream()
            .collect(Collectors.groupingBy(r -> r.getConstructor().getId()));

        List<ConstructorStandingDto> standings = byConstructor.values().stream().map(entries -> {
            RaceResult sample = entries.getFirst();
            return ConstructorStandingDto.builder()
                .constructorId(sample.getConstructor().getId())
                .constructorRef(sample.getConstructor().getConstructorRef())
                .constructorName(sample.getConstructor().getName())
                .nationality(sample.getConstructor().getNationality())
                .points(points(entries))
                .wins(finishes(entries, 1, 1))
                .podiums(finishes(entries, 1, 3))
                .racesEntered(entries.stream().map(r -> r.getRace().getId()).distinct().count())
                .build();
        }).sorted(Comparator.comparing(ConstructorStandingDto::getPoints).reversed()
            .thenComparing(ConstructorStandingDto::getWins, Comparator.reverseOrder())
            .thenComparing(ConstructorStandingDto::getConstructorName)).toList();
        assignConstructorPositions(standings);
        return standings;
    }

    private List<RaceResult> seasonResults(Integer season) {
        if (!seasons.existsById(season)) {
            throw new ResourceNotFoundException("Season", "year", season);
        }
        return results.findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(season);
    }

    private BigDecimal points(List<RaceResult> entries) {
        return entries.stream().map(RaceResult::getPoints).filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long finishes(List<RaceResult> entries, int minimum, int maximum) {
        return entries.stream().map(RaceResult::getFinishPosition).filter(Objects::nonNull)
            .filter(position -> position >= minimum && position <= maximum).count();
    }

    private void assignDriverPositions(List<DriverStandingDto> standings) {
        for (int index = 0; index < standings.size(); index++) standings.get(index).setPosition(index + 1);
    }

    private void assignConstructorPositions(List<ConstructorStandingDto> standings) {
        for (int index = 0; index < standings.size(); index++) standings.get(index).setPosition(index + 1);
    }
}
