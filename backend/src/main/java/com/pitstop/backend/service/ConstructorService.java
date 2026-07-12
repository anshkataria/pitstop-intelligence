package com.pitstop.backend.service;

import com.pitstop.backend.dto.ConstructorDto;
import com.pitstop.backend.dto.ConstructorStandingDto;
import com.pitstop.backend.dto.RaceResultDto;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.ConstructorMapper;
import com.pitstop.backend.repository.ConstructorRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConstructorService {
    private final ConstructorRepository constructors;
    private final RaceResultRepository results;
    private final ConstructorMapper mapper;
    private final RaceResultService raceResultService;
    private final StandingsService standingsService;

    public List<ConstructorDto> findAll() {
        return constructors.findAllByOrderByNameAsc().stream().map(mapper::toDto).toList();
    }

    public ConstructorDto findById(Long id) {
        return constructors.findById(id).map(mapper::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Constructor", "id", id));
    }

    public List<RaceResultDto> findResults(Long id, Integer season) {
        if (!constructors.existsById(id)) {
            throw new ResourceNotFoundException("Constructor", "id", id);
        }
        return results.findByConstructorIdAndRaceSeasonYearOrderByRaceRoundAsc(id, season)
            .stream().map(raceResultService::toDto).toList();
    }

    public List<ConstructorStandingDto> standings(Integer season) {
        return standingsService.constructorStandings(season);
    }
}
