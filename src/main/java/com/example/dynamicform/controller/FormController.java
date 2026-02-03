package com.example.dynamicform.controller;

import com.example.dynamicform.dto.CreateFormRequest;
import com.example.dynamicform.dto.CreateVersionRequest;
import com.example.dynamicform.dto.PublishResponse;
import com.example.dynamicform.dto.SubmitRequest;
import com.example.dynamicform.models.Form;
import com.example.dynamicform.models.FormSubmission;
import com.example.dynamicform.models.FormVersion;
import com.example.dynamicform.service.FormService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/forms")
public class FormController {
    private final FormService service;

    public FormController(FormService service) {
        this.service = service;
    }

    @PostMapping
    public Form createForm(@Valid @RequestBody CreateFormRequest req) {
        return service.createForm(req.name(), req.createdBy());
    }

    @PostMapping("/{formId}/versions")
    public FormVersion createVersion(@PathVariable UUID formId,
                                     @Valid @RequestBody CreateVersionRequest req) {
        return service.createNewVersion(formId, req.schemaJson());
    }

    @PostMapping("/{formId}/versions/{versionId}/publish")
    public PublishResponse publish(@PathVariable UUID formId, @PathVariable UUID versionId) {
        FormVersion v = service.publishVersion(formId, versionId);
        return new PublishResponse(formId, v.getId(), v.getActive());
    }

    @GetMapping("/{formId}/active")
    public FormVersion getActive(@PathVariable UUID formId) {
        return service.getActiveVersion(formId);
    }

    @PostMapping("/{formId}/submissions")
    public FormSubmission submit(@PathVariable UUID formId,
                                 @Valid @RequestBody SubmitRequest req) {
        return service.submit(formId, req.formVersionId(), req.submittedBy(), req.answersJson());
    }

    @PostMapping("/{formId}/archive")
    public void archive(@PathVariable UUID formId) {
        service.archiveForm(formId);
    }
}
