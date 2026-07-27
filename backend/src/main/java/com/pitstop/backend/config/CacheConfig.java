package com.pitstop.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.cache.CacheProperties;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

/**
 * Spring Boot's default Redis cache value serializer is JDK serialization, which throws for
 * any cached type (e.g. our Lombok @Data DTOs) that doesn't implement Serializable. Switch to
 * JSON so @Cacheable works without every DTO needing to opt into Serializable.
 */
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManagerBuilderCustomizer jsonCacheValuesCustomizer(
            ObjectMapper objectMapper, CacheProperties cacheProperties) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer(objectMapper)));

        CacheProperties.Redis redisProps = cacheProperties.getRedis();
        if (redisProps.getTimeToLive() != null) {
            config = config.entryTtl(redisProps.getTimeToLive());
        }
        if (!redisProps.isCacheNullValues()) {
            config = config.disableCachingNullValues();
        }
        if (!redisProps.isUseKeyPrefix()) {
            config = config.disableKeyPrefix();
        }

        RedisCacheConfiguration finalConfig = config;
        return builder -> builder.cacheDefaults(finalConfig);
    }
}
