package com.example.dynamicform.models;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "form_submissions")
public class FormSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "form_id", nullable = false, columnDefinition = "uuid")
    private UUID formId;

    @Column(name = "form_version_id", nullable = false, columnDefinition = "uuid")
    private UUID formVersionId;

    @Column(name = "submitted_by")
    private String submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private OffsetDateTime submittedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers_json", nullable = false, columnDefinition = "jsonb")
    private JsonNode answersJson;

    public FormSubmission() {
    }

    public FormSubmission(UUID id, UUID formId, UUID formVersionId, String submittedBy, OffsetDateTime submittedAt, JsonNode answersJson) {
        this.id = id;
        this.formId = formId;
        this.formVersionId = formVersionId;
        this.submittedBy = submittedBy;
        this.submittedAt = submittedAt;
        this.answersJson = answersJson;
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

    public UUID getFormVersionId() {
        return formVersionId;
    }

    public void setFormVersionId(UUID formVersionId) {
        this.formVersionId = formVersionId;
    }

    public String getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(String submittedBy) {
        this.submittedBy = submittedBy;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public JsonNode getAnswersJson() {
        return answersJson;
    }

    public void setAnswersJson(JsonNode answersJson) {
        this.answersJson = answersJson;
    }
}
