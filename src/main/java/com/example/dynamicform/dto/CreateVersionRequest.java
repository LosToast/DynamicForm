package com.example.dynamicform.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

import java.util.Map;

public record CreateVersionRequest(@NotNull Map<String, Object> schemaJson) {
}
