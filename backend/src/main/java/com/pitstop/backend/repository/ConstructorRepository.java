package com.pitstop.backend.repository;

import com.pitstop.backend.entity.Constructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConstructorRepository extends JpaRepository<Constructor, Long> {

    Optional<Constructor> findByConstructorRef(String constructorRef);

    boolean existsByConstructorRef(String constructorRef);

    Page<Constructor> findByNationality(String nationality, Pageable pageable);
}