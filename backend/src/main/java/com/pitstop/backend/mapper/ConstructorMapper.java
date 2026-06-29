package com.pitstop.backend.mapper;

import com.pitstop.backend.dto.ConstructorDto;
import com.pitstop.backend.entity.Constructor;
import org.springframework.stereotype.Component;

@Component
public class ConstructorMapper {

    public ConstructorDto toDto(Constructor constructor) {
        return ConstructorDto.builder()
                .id(constructor.getId())
                .constructorRef(constructor.getConstructorRef())
                .name(constructor.getName())
                .nationality(constructor.getNationality())
                .build();
    }
}