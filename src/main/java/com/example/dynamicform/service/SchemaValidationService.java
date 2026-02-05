package com.example.dynamicform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.dialect.Dialects;
import jakarta.persistence.SchemaValidationException;
import org.springframework.stereotype.Service;


import java.util.List;
import java.util.stream.Collectors;


@Service
public class SchemaValidationService {
    private static final SchemaRegistry registry = SchemaRegistry.withDialect(Dialects.getDraft202012());
    private static final ObjectMapper objectMapper = new ObjectMapper();

    // Method to validate a given schema
    public void validateSchema(String schemaJson,  JsonNode submissionData) throws SchemaValidationException {
        try {
            // Load schema
            Schema schema = registry.getSchema(schemaJson);
            List<Error> errors = schema.validate(submissionData);

            // If there are validation errors, throw exception
            if (!errors.isEmpty()) {
                String errorMessages = errors.stream()
                        .map(Error::getMessage)
                        .collect(Collectors.joining("\n"));
                throw new SchemaValidationException(errorMessages);
            }
        } catch (Exception e) {
            throw new SchemaValidationException("Schema validation failed: " + e.getMessage());
        }
    }
}
