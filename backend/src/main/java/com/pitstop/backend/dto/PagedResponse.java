package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PagedResponse<T> {

    List<T> content;
    int page;
    int size;
    long totalElements;
    int totalPages;
    boolean last;
}