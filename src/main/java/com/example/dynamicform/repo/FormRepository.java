package com.example.dynamicform.repo;

import com.example.dynamicform.models.Form;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FormRepository extends JpaRepository<Form, UUID> {
    /*
    * What this does
    * Postgres will lock the forms row for that formId
    * If another publish comes in for the same form, it will wait until the first transaction completes
    * Publishing different forms won’t block each other ✅
    * */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Form f where f.id = :formId")
    Optional<Form> findByIdForUpdate(@Param("formId") UUID formId);
}
