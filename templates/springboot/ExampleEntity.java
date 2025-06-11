// Example: templates/springboot/ExampleEntity.java
package com.example.generated.model; // LLM should place entities in a 'model' or 'domain' sub-package

import jakarta.persistence.*; // JPA annotations (jakarta.* for Spring Boot 3+)
// For Spring Boot 2.x, it would be javax.persistence.*

// import java.time.LocalDate; // For Date fields
// import java.time.LocalDateTime; // For Timestamp fields
// import java.math.BigDecimal; // For Decimal/Numeric fields
// import java.util.UUID; // For UUID fields
// import java.util.Set; // For ToMany relationships
// import java.util.HashSet; // For ToMany relationships

// Lombok annotations (optional, but common for boilerplate reduction)
// import lombok.Getter;
// import lombok.Setter;
// import lombok.NoArgsConstructor;
// import lombok.AllArgsConstructor;
// import lombok.ToString;
// import lombok.EqualsAndHashCode;

@Entity
@Table(name = "example_entities") // LLM should replace 'example_entities' with the actual table name (e.g., "users", "products")
// Example Lombok annotations (if used):
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @ToString
// @EqualsAndHashCode(of = {"id"}) // Important for JPA entities
public class ExampleEntity { // LLM should rename this class (e.g., User, Product)

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Common for auto-incrementing IDs
    // For UUIDs, it might be:
    // @GeneratedValue(strategy = GenerationType.UUID)
    // @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)") // Or specific DB UUID type
    private Long id; // LLM should choose appropriate type (Long, Integer, UUID, String) based on schema's PK type

    @Column(name = "name", nullable = false, unique = true, length = 100) // Example constraints
    private String name; // Example attribute

    @Column(name = "description", columnDefinition = "TEXT")
    private String description; // Example of a TEXT type for longer strings

    // Example of a Date field
    // @Column(name = "created_at")
    // @Temporal(TemporalType.TIMESTAMP) // Or TemporalType.DATE
    // private LocalDateTime createdAt;

    // Example of a Boolean field
    // @Column(name = "is_active", nullable = false)
    // private boolean isActive = true;

    // --- Example Relationships ---

    // Example ManyToOne relationship (e.g., a Post belonging to a User)
    // @ManyToOne(fetch = FetchType.LAZY) // LAZY fetching is generally recommended
    // @JoinColumn(name = "related_entity_id", nullable = false) // FK column in this table
    // private RelatedEntity relatedEntity; // LLM should replace RelatedEntity with the actual related entity class

    // Example OneToMany relationship (e.g., a User having many Posts)
    // @OneToMany(mappedBy = "exampleEntity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    // private Set<AnotherRelatedEntity> anotherRelatedEntities = new HashSet<>();
    // 'mappedBy' should point to the field in AnotherRelatedEntity that owns the relationship (e.g., "exampleEntity")

    // Constructors (if not using Lombok @NoArgsConstructor, @AllArgsConstructor)
    public ExampleEntity() {
    }

    public ExampleEntity(String name, String description) {
        this.name = name;
        this.description = description;
    }

    // Getters and Setters (if not using Lombok @Getter, @Setter)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    // Getters and setters for relationships and other fields would go here
    // public RelatedEntity getRelatedEntity() { return relatedEntity; }
    // public void setRelatedEntity(RelatedEntity relatedEntity) { this.relatedEntity = relatedEntity; }
    // public Set<AnotherRelatedEntity> getAnotherRelatedEntities() { return anotherRelatedEntities; }
    // public void setAnotherRelatedEntities(Set<AnotherRelatedEntity> anotherRelatedEntities) { this.anotherRelatedEntities = anotherRelatedEntities; }


    // equals() and hashCode() (if not using Lombok @EqualsAndHashCode)
    // It's important to implement these correctly for JPA entities, typically based on the ID.
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExampleEntity that = (ExampleEntity) o;
        // Use ID for equality if it's persistent and not null
        // If ID can be null (before persistence), this might need more careful handling
        // or rely on a business key. For simplicity, assuming ID is the primary factor after persistence.
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        // Use a prime number and the class hash for initial value
        // to ensure different classes with same ID don't collide.
        return getClass().hashCode();
    }

    // toString() (if not using Lombok @ToString)
    @Override
    public String toString() {
        return "ExampleEntity{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", description='" + description + '\'' +
               // ", createdAt=" + createdAt +
               // ", isActive=" + isActive +
               '}';
    }
}
