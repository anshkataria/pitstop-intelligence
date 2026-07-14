package com.pitstop.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pitstop.backend.observability.CorrelationIdFilter;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class LiveReplayService {
    private final RestClient client;
    private final String internalToken;

    public LiveReplayService(RestClient.Builder builder,
            @Value("${services.live.base-url}") String baseUrl,
            @Value("${services.ml.internal-token}") String internalToken) {
        this.client = builder.baseUrl(baseUrl).build();
        this.internalToken = internalToken;
    }

    public JsonNode start(JsonNode request) {
        return client.post().uri("/v1/replay")
                .header("X-Pitstop-Internal-Token", internalToken)
                .header(CorrelationIdFilter.HEADER, requestId())
                .contentType(MediaType.APPLICATION_JSON).body(request)
                .retrieve().body(JsonNode.class);
    }

    private String requestId() {
        return MDC.get(CorrelationIdFilter.MDC_KEY) == null
                ? "spring-internal" : MDC.get(CorrelationIdFilter.MDC_KEY);
    }
}
