package com.example.dynamicform.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

public record SubmitRequest(@NotNull UUID formVersionId,
                            String submittedBy,
                            @NotNull JsonNode answersJson) {
}
