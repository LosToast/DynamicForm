package com.example.dynamicform.service;

import com.example.dynamicform.errorHandling.BadRequestException;
import com.example.dynamicform.errorHandling.NotFoundException;
import com.example.dynamicform.models.Form;
import com.example.dynamicform.models.FormStatus;
import com.example.dynamicform.models.FormSubmission;
import com.example.dynamicform.models.FormVersion;
import com.example.dynamicform.repo.FormRepository;
import com.example.dynamicform.repo.FormSubmissionRepository;
import com.example.dynamicform.repo.FormVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class FormService {
    private final FormRepository formRepo;
    private final FormVersionRepository versionRepo;
    private final FormSubmissionRepository submissionRepo;

    public FormService(FormRepository formRepo, FormVersionRepository versionRepo, FormSubmissionRepository submissionRepo) {
        this.formRepo = formRepo;
        this.versionRepo = versionRepo;
        this.submissionRepo = submissionRepo;
    }

    public Form createForm(String name, String createdBy) {
        Form f = new Form();
        f.setName(name);
        f.setCreatedBy(createdBy);
        f.setStatus(FormStatus.DRAFT);
        // created_at/updated_at are set by DB defaults
        return formRepo.save(f);
    }

    @Transactional
    public FormVersion createNewVersion(UUID formId, Map<String, Object> schemaJson) {
        // Ensure form exists
        Form form = formRepo.findById(formId)
                .orElseThrow(() -> new NotFoundException("Form not found: " + formId));

        if (form.getStatus() == FormStatus.ARCHIVED) {
            throw new BadRequestException("Form is archived and cannot be modified.");
        }

        int nextVersion = versionRepo.findTopByFormIdOrderByVersionDesc(formId)
                .map(v -> v.getVersion() + 1)
                .orElse(1);

        FormVersion v = new FormVersion();
        v.setFormId(formId);
        v.setVersion(nextVersion);
        v.setSchemaJson(schemaJson);
        v.setActive(false);
        v.setCreatedAt(OffsetDateTime.now());
        return versionRepo.save(v);
    }

    @Transactional
    public FormVersion publishVersion(UUID formId, UUID versionId) {
        Form form = formRepo.findById(formId)
                .orElseThrow(() -> new NotFoundException("Form not found: " + formId));

        if (form.getStatus() == FormStatus.ARCHIVED) {
            throw new BadRequestException("Form is archived and cannot be published.");
        }

        FormVersion toPublish = versionRepo.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));

        if (!toPublish.getFormId().equals(formId)) {
            throw new BadRequestException("Version does not belong to form.");
        }

        // Deactivate any current active version
        versionRepo.findByFormIdAndIsActiveTrue(formId).ifPresent(active -> {
            active.setActive(false);
            versionRepo.save(active);
        });

        // Activate target version
        toPublish.setActive(true);
        toPublish.setPublishedAt(OffsetDateTime.now());
        versionRepo.save(toPublish);

        // Update form status
        form.setStatus(FormStatus.PUBLISHED);
        formRepo.save(form);

        return toPublish;
    }

    public FormVersion getActiveVersion(UUID formId) {
        return versionRepo.findByFormIdAndIsActiveTrue(formId)
                .orElseThrow(() -> new NotFoundException("No active version found for form: " + formId));
    }

    public FormSubmission submit(UUID formId, UUID versionId, String submittedBy, JsonNode answersJson) {
        // Must exist and match
        FormVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found: " + versionId));

        if (!version.getFormId().equals(formId)) {
            throw new BadRequestException("Submission version does not belong to this form.");
        }

        if (!Boolean.TRUE.equals(version.getActive())) {
            throw new BadRequestException("Cannot submit to an inactive (not published) form version.");
        }

        // For POC: store as-is. Later: validate answers against schema.
        FormSubmission s = new FormSubmission();
        s.setFormId(formId);
        s.setFormVersionId(versionId);
        s.setSubmittedBy(submittedBy);
        s.setSubmittedAt(OffsetDateTime.now());
        s.setAnswersJson(answersJson);

        return submissionRepo.save(s);
    }

    @Transactional
    public void archiveForm(UUID formId) {
        Form form = formRepo.findById(formId)
                .orElseThrow(() -> new NotFoundException("Form not found: " + formId));
        form.setStatus(FormStatus.ARCHIVED);
        formRepo.save(form);

        // Optional: deactivate any active version
        versionRepo.findByFormIdAndIsActiveTrue(formId).ifPresent(active -> {
            active.setActive(false);
            versionRepo.save(active);
        });
    }
}
