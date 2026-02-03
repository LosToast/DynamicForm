package com.example.dynamicform.dto;

import java.util.UUID;

public record PublishResponse(UUID formId,
                              UUID versionId,
                              boolean active) {
}
