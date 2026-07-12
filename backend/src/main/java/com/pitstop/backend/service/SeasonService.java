package com.pitstop.backend.service;

import com.pitstop.backend.repository.SeasonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeasonService {
    private final SeasonRepository seasons;

    public List<Integer> findAllYears() {
        return seasons.findAllYearsDescending();
    }
}
