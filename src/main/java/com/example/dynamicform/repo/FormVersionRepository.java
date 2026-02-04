package com.example.dynamicform.repo;

import com.example.dynamicform.models.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {
    Optional<FormVersion> findByFormIdAndIsActiveTrue(UUID formId);
    Optional<FormVersion> findTopByFormIdOrderByVersionDesc(UUID formId);
    Optional<FormVersion> findById(UUID id);
    @Query("select v from FormVersion v where v.formId = :formId order by v.version desc")
    List<FormVersion> findAllByFormIdOrderByVersionDesc(@Param("formId") UUID formId);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update FormVersion v set v.isActive = false where v.formId = :formId and v.isActive = true")
    int deactivateActive(@Param("formId") UUID formId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update FormVersion v set v.isActive = true, v.publishedAt = :publishedAt where v.formId = :formId and v.id = :versionId")
    int activateVersion(@Param("formId") UUID formId,
                        @Param("versionId") UUID versionId,
                        @Param("publishedAt") OffsetDateTime publishedAt);

}
