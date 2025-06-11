// Example: templates/springboot/ExampleRepository.java
package com.example.generated.repository; // LLM should place repositories in a 'repository' sub-package

import com.example.generated.model.ExampleEntity; // LLM should import the correct Entity class
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

// import java.util.List; // For methods returning multiple results
// import java.util.Optional; // For methods that might not find an entity

@Repository
public interface ExampleRepository extends JpaRepository<ExampleEntity, Long> { // LLM should replace ExampleEntity and Long (ID type)

    // Spring Data JPA will automatically implement methods based on their names.
    // For example, to find an entity by its 'name' attribute (if 'name' exists in ExampleEntity):
    // Optional<ExampleEntity> findByName(String name);

    // Example of a custom query using JPQL (Java Persistence Query Language)
    // @Query("SELECT e FROM ExampleEntity e WHERE e.description LIKE %:keyword%")
    // List<ExampleEntity> findByDescriptionContaining(@Param("keyword") String keyword);

    // Example of a custom query with a more complex condition
    // @Query("SELECT e FROM ExampleEntity e WHERE e.name = :name AND e.isActive = :isActive")
    // List<ExampleEntity> findByNameAndIsActive(@Param("name") String name, @Param("isActive") boolean isActive);

    // If ExampleEntity had a 'category' field:
    // List<ExampleEntity> findByCategoryOrderByNameAsc(String category);

    // The LLM should generate appropriate finder methods based on the attributes
    // of the specific entity it's creating a repository for, especially for unique fields or indexed fields.
}
// The LLM should also consider generating methods for pagination and sorting if needed, such as:
// Page<ExampleEntity> findByCategory(String category, Pageable pageable);