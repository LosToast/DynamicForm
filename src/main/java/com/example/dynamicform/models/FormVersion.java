package com.example.dynamicform.models;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "form_versions",
        uniqueConstraints = @UniqueConstraint(name = "uq_form_version", columnNames = {"form_id", "version"}))

public class FormVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "form_id", nullable = false, columnDefinition = "uuid")
    private UUID formId;

    @Column(nullable = false)
    private Integer version;

    @Basic
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> schemaJson;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public FormVersion(UUID id, UUID formId, Integer version, Map<String, Object> schemaJson, Boolean isActive, OffsetDateTime publishedAt, OffsetDateTime createdAt) {
        this.id = id;
        this.formId = formId;
        this.version = version;
        this.schemaJson = schemaJson;
        this.isActive = isActive;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
    }

    public FormVersion() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFormId() {
        return formId;
    }

    public void setFormId(UUID formId) {
        this.formId = formId;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Map<String, Object> getSchemaJson() {
        return schemaJson;
    }

    public void setSchemaJson(Map<String, Object> schemaJson) {
        this.schemaJson = schemaJson;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(OffsetDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
