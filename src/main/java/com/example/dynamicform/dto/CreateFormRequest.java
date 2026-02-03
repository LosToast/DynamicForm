package com.example.dynamicform.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateFormRequest(@NotBlank String name,
                                String createdBy)
{}
