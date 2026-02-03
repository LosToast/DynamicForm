package com.example.dynamicform.repo;

import com.example.dynamicform.models.FormSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FormSubmissionRepository extends JpaRepository<FormSubmission, UUID> {
}
