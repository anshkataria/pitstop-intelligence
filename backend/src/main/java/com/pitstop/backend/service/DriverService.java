package com.pitstop.backend.service;

import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.dto.PagedResponse;
import com.pitstop.backend.entity.Driver;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.DriverMapper;
import com.pitstop.backend.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DriverService {

    private final DriverRepository driverRepository;
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
        Pageable pageable = PageRequest.of(page, size, Sort.by("lastName").ascending());
        Page<Driver> result = driverRepository.findAll(pageable);
        return toPagedResponse(result);
    }

    public PagedResponse<DriverDto> search(String name, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("lastName").ascending());
        Page<Driver> result = driverRepository.searchByName(name, pageable);
        return toPagedResponse(result);
    }

    private PagedResponse<DriverDto> toPagedResponse(Page<Driver> page) {
        List<DriverDto> content = page.getContent().stream()
                .map(driverMapper::toDto)
                .toList();

        return PagedResponse.<DriverDto>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}