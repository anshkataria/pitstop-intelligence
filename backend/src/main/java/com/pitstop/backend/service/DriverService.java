package com.pitstop.backend.service;

import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.dto.PagedResponse;
import com.pitstop.backend.entity.Driver;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.DriverMapper;
import com.pitstop.backend.repository.DriverRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DriverService {

    private final DriverRepository driverRepository;
    private final RaceResultRepository raceResultRepository;
    private final DriverMapper driverMapper;

    @Cacheable(value = "drivers", key = "#id")
    public DriverDto findById(Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver", "id", id));
        return driverMapper.toDto(driver);
    }

    @Cacheable(value = "drivers", key = "'ref:' + #driverRef")
    public DriverDto findByRef(String driverRef) {
        Driver driver = driverRepository.findByDriverRef(driverRef)
                .orElseThrow(() -> new ResourceNotFoundException("Driver", "driverRef", driverRef));
        return driverMapper.toDto(driver);
    }

    public PagedResponse<DriverDto> findAll(int page, int size) {
        Page<Driver> all = driverRepository.findAll(Pageable.unpaged());
        return rankByCareerWins(all.getContent(), page, size);
    }

    public PagedResponse<DriverDto> search(String name, int page, int size) {
        Page<Driver> matches = driverRepository.searchByName(name, Pageable.unpaged());
        return rankByCareerWins(matches.getContent(), page, size);
    }

    /**
     * The roster is small enough (order of a hundred drivers) to rank entirely in memory: load every
     * matching driver, attach career wins/podiums/points computed from their full result history, sort
     * by that, then slice out the requested page. Ranking by wins can't be pushed down into the paged
     * DB query since the win count isn't a column on Driver — it's an aggregate over race_results.
     */
    private PagedResponse<DriverDto> rankByCareerWins(List<Driver> drivers, int page, int size) {
        List<Long> driverIds = drivers.stream().map(Driver::getId).toList();
        Map<Long, List<RaceResult>> resultsByDriver = raceResultRepository.findByDriverIdIn(driverIds).stream()
                .collect(Collectors.groupingBy(r -> r.getDriver().getId()));

        Comparator<DriverDto> byCareerRank = Comparator.comparingLong(DriverDto::getWins).reversed()
                .thenComparing(Comparator.comparingLong(DriverDto::getPodiums).reversed())
                .thenComparing(Comparator.comparing(DriverDto::getPoints).reversed())
                .thenComparing(DriverDto::getLastName);

        List<DriverDto> ranked = drivers.stream()
                .map(driver -> withCareerStats(driver, resultsByDriver.getOrDefault(driver.getId(), List.of())))
                .sorted(byCareerRank)
                .toList();

        int total = ranked.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        return PagedResponse.<DriverDto>builder()
                .content(ranked.subList(from, to))
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();
    }

    private DriverDto withCareerStats(Driver driver, List<RaceResult> results) {
        DriverDto dto = driverMapper.toDto(driver);
        dto.setWins(finishes(results, 1, 1));
        dto.setPodiums(finishes(results, 1, 3));
        dto.setPoints(points(results));
        return dto;
    }

    private BigDecimal points(List<RaceResult> entries) {
        return entries.stream().map(RaceResult::getPoints).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long finishes(List<RaceResult> entries, int minimum, int maximum) {
        return entries.stream().map(RaceResult::getFinishPosition).filter(Objects::nonNull)
                .filter(position -> position >= minimum && position <= maximum).count();
    }
}
