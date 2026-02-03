package com.example.dynamicform.repo;

import com.example.dynamicform.models.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {
    Optional<FormVersion> findByFormIdAndIsActiveTrue(UUID formId);
    Optional<FormVersion> findTopByFormIdOrderByVersionDesc(UUID formId);

}
