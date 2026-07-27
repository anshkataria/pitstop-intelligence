package com.pitstop.backend.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import org.springframework.boot.autoconfigure.cache.CacheProperties;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.JacksonObjectReader;
import org.springframework.data.redis.serializer.JacksonObjectWriter;
import org.springframework.data.redis.serializer.RedisSerializationContext;

/**
 * Spring Boot's default Redis cache value serializer is JDK serialization, which throws for
 * any cached type (e.g. our Lombok @Data DTOs) that doesn't implement Serializable. Switch to
 * JSON so @Cacheable works without every DTO needing to opt into Serializable.
 *
 * Single-object @Cacheable methods (e.g. findById) need the cached JSON to carry a type hint —
 * without one, Spring deserializes the cache hit into a raw LinkedHashMap, and the CGLIB proxy's
 * generated cast to the declared return type (e.g. RaceDto) throws ClassCastException on every
 * hit. List-returning methods don't hit this (the cast is to the erased List type), which let it
 * slip through undetected at first.
 *
 * Getting both to work with ONE serializer needs two things together, not just default typing:
 *   1. A copy of the app's HTTP ObjectMapper (so JavaTimeModule etc. are already registered for
 *      LocalDate fields) — copied, not mutated, because default typing must never leak into HTTP
 *      responses.
 *   2. A writer that forces the ROOT value's static type to Object.class. Jackson's default typing
 *      never adds a type wrapper to the root value when serialized via plain writeValueAsBytes(value)
 *      (static type == runtime type there, so no ambiguity to resolve) — that's fine for a single
 *      DTO under PROPERTY inclusion (the object still gets its own "@class" field), but a cached
 *      List<Dto> then serializes as a plain untagged array of tagged elements, which the reader's
 *      polymorphic Object.class deserializer can't parse back (it expects the outermost value
 *      itself to carry — or degrade to — a type wrapper). Forcing the root type to Object.class
 *      makes Jackson apply that same wrapping to List/Map root values too.
 */
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManagerBuilderCustomizer jsonCacheValuesCustomizer(
            ObjectMapper objectMapper, CacheProperties cacheProperties) {
        ObjectMapper cacheMapper = objectMapper.copy();
        cacheMapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY);

        JacksonObjectWriter rootAsObjectWriter =
                (mapper, source) -> mapper.writerFor(Object.class).writeValueAsBytes(source);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(
                                cacheMapper, JacksonObjectReader.create(), rootAsObjectWriter)));

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
