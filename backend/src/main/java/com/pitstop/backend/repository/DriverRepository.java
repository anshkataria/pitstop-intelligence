package com.pitstop.backend.repository;

import com.pitstop.backend.entity.Driver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {

    Optional<Driver> findByDriverRef(String driverRef);

    boolean existsByDriverRef(String driverRef);

    @Query("SELECT d FROM Driver d WHERE " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR " +
           "LOWER(d.lastName)  LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Driver> searchByName(@Param("name") String name, Pageable pageable);

    Page<Driver> findByNationality(String nationality, Pageable pageable);
}