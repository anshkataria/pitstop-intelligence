package com.pitstop.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pitstop.backend.observability.CorrelationIdFilter;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Service
public class MlProxyService {
    static final String INTERNAL_TOKEN_HEADER = "X-Pitstop-Internal-Token";

    private final RestClient client;
    private final String internalToken;

    public MlProxyService(RestClient.Builder builder,
                          @Value("${services.ml.base-url}") String baseUrl,
                          @Value("${services.ml.internal-token}") String internalToken) {
        this.client = builder.baseUrl(baseUrl).build();
        this.internalToken = internalToken;
    }

    public JsonNode health() {
        return exchange(() -> client.get()
                .uri("/v1/health")
                .header(CorrelationIdFilter.HEADER, requestId())
                .retrieve()
                .body(JsonNode.class));
    }

    public JsonNode predict(JsonNode request) {
        return post("/v1/predict", request);
    }

    public JsonNode train(JsonNode request) {
        return exchange(() -> client.post()
                .uri("/v1/train")
                .header(CorrelationIdFilter.HEADER, requestId())
                .header(INTERNAL_TOKEN_HEADER, internalToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(JsonNode.class));
    }

    private JsonNode post(String path, JsonNode request) {
        return exchange(() -> client.post()
                .uri(path)
                .header(CorrelationIdFilter.HEADER, requestId())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(JsonNode.class));
    }

    private String requestId() {
        String requestId = MDC.get(CorrelationIdFilter.MDC_KEY);
        return requestId == null ? "spring-internal" : requestId;
    }

    private JsonNode exchange(MlCall call) {
        try {
            JsonNode response = call.execute();
            if (response == null) {
                throw new ResponseStatusException(BAD_GATEWAY, "ML service returned an empty response");
            }
            return response;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(
                        ex.getStatusCode(), "ML request was rejected", ex);
            }
            throw new ResponseStatusException(BAD_GATEWAY, "ML service is unavailable", ex);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "ML service is unavailable", ex);
        }
    }

    @FunctionalInterface
    private interface MlCall {
        JsonNode execute();
    }
}
