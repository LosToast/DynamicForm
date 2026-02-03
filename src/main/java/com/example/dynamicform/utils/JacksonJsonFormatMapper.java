package com.example.dynamicform.utils;

import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.JavaType;
import org.hibernate.type.format.FormatMapper;
import tools.jackson.databind.json.JsonMapper;

public class JacksonJsonFormatMapper implements FormatMapper {

    private final JsonMapper mapper;

    public JacksonJsonFormatMapper() {
        this.mapper = JsonMapper.builder().build();
    }

    public JacksonJsonFormatMapper(JsonMapper mapper) {
        this.mapper = mapper;
    }
    @Override
    public <T> T fromString(CharSequence charSequence, JavaType<T> javaType, WrapperOptions wrapperOptions) {
        try {
            if (charSequence == null) return null;

            // javaType.getJavaType() returns java.lang.reflect.Type
            var targetType = mapper.constructType(javaType.getJavaType());
            return mapper.readValue(charSequence.toString(), targetType);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Failed to deserialize JSON for JavaType: " + javaType.getJavaType(),
                    e
            );
        }
    }

    @Override
    public <T> String toString(T value, JavaType<T> javaType, WrapperOptions wrapperOptions) {
        try {
            if (value == null) return null;

            var targetType = mapper.constructType(javaType.getJavaType());
            return mapper.writerFor(targetType).writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Failed to serialize JSON for JavaType: " + javaType.getJavaType(),
                    e
            );
        }
    }
}
