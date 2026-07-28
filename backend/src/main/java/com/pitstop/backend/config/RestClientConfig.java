package com.pitstop.backend.config;

import java.net.http.HttpClient;

import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;

@Configuration
public class RestClientConfig {

    /**
     * The internal ml-service and live-service are plain HTTP/1.1 (uvicorn/h11).
     * The JDK HttpClient defaults to preferring HTTP/2, which those servers
     * misparse as invalid requests, so pin it to HTTP/1.1 for all RestClients.
     */
    @Bean
    RestClientCustomizer http11RestClientCustomizer() {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        return builder -> builder.requestFactory(new JdkClientHttpRequestFactory(httpClient));
    }
}
