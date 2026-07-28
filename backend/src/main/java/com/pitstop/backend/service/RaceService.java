package com.pitstop.backend.service;

import com.pitstop.backend.dto.RaceDto;
import com.pitstop.backend.entity.Race;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.RaceMapper;
import com.pitstop.backend.repository.RaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RaceService {

    private final RaceRepository raceRepository;
    private final RaceMapper raceMapper;

    @Cacheable(value = "races", key = "#id")
    public RaceDto findById(Long id) {
        Race race = raceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Race", "id", id));
        return raceMapper.toDto(race);
    }

    public List<RaceDto> findUpcoming() {
        return raceRepository.findUpcoming(LocalDate.now())
                .stream()
                .map(raceMapper::toDto)
                .toList();
    }

    @Cacheable(value = "races", key = "'season:' + #year")
    public List<RaceDto> findBySeason(Integer year) {
        return raceRepository.findBySeasonYearWithSeason(year)
                .stream()
                .map(raceMapper::toDto)
                .toList();
    }

    @Cacheable(value = "races", key = "'season:' + #year + ':round:' + #round")
    public RaceDto findBySeasonAndRound(Integer year, Integer round) {
        Race race = raceRepository.findBySeasonYearAndRound(year, round)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Race", "season/round", year + "/" + round));
        return raceMapper.toDto(race);
    }
}