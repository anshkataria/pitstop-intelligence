package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConstructorDto {

    Long id;
    String constructorRef;
    String name;
    String nationality;
}