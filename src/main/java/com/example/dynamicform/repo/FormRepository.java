package com.example.dynamicform.repo;

import com.example.dynamicform.models.Form;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FormRepository extends JpaRepository<Form, UUID> {
}
