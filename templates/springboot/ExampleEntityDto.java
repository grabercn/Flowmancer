// Example: templates/springboot/ExampleEntityDto.java
package com.example.generated.dto; // LLM should place DTOs in a 'dto' or 'payload' sub-package

// Import necessary types for attributes
// import java.time.LocalDate;
// import java.time.LocalDateTime;
// import java.math.BigDecimal;
// import java.util.UUID;
// import java.util.List; // For nested DTOs in relationships

// Jakarta Validation API annotations (for request DTOs)
// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.Size;
// import jakarta.validation.constraints.Email;
// import jakarta.validation.constraints.NotNull;
// import jakarta.validation.constraints.Min;
// import jakarta.validation.constraints.Max;

// Lombok annotations (optional)
// import lombok.Data; // A shortcut for @Getter, @Setter, @ToString, @EqualsAndHashCode, @RequiredArgsConstructor
// import lombok.NoArgsConstructor;
// import lombok.AllArgsConstructor;
// import lombok.Builder;

// If using Lombok:
// @Data
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
public class ExampleEntityDto { // LLM should rename this (e.g., UserDto, ProductResponse, BookCreateRequest)

    // --- Fields for Response DTO (typically matches entity closely or subset/superset) ---
    private Long id; // Or Integer, UUID, String, matching the entity's ID type
    private String name;
    private String description;
    // private LocalDateTime createdAt;
    // private boolean isActive;

    // Example of a nested DTO for a relationship (e.g., if ExampleEntity has a RelatedEntity)
    // private RelatedEntitySummaryDto relatedEntity; // LLM would define RelatedEntitySummaryDto

    // Example of a list of nested DTOs for a OneToMany relationship
    // private List<AnotherRelatedEntityDto> anotherRelatedEntities;


    // --- Fields for Request DTO (e.g., ExampleEntityCreateRequestDto) ---
    // These might have validation annotations and omit fields like 'id' or 'createdAt'
    
    // @NotBlank(message = "Name is mandatory")
    // @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    // private String nameForCreate; // Different field name or same if context is clear

    // @NotNull(message = "Active status is required")
    // private Boolean isActiveForCreate;


    // Constructors (if not using Lombok)
    public ExampleEntityDto() {
    }

    // Constructor for mapping from Entity (if this DTO is a response DTO)
    // public ExampleEntityDto(Long id, String name, String description /*, other fields... */) {
    //     this.id = id;
    //     this.name = name;
    //     this.description = description;
    //     // ... initialize other fields ...
    // }


    // Getters and Setters (if not using Lombok)
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

    // Getters and setters for other fields and nested DTOs...
    // public RelatedEntitySummaryDto getRelatedEntity() { return relatedEntity; }
    // public void setRelatedEntity(RelatedEntitySummaryDto relatedEntity) { this.relatedEntity = relatedEntity; }


    // toString(), equals(), hashCode() (if not using Lombok @Data or @ToString, @EqualsAndHashCode)
    // For DTOs, these are less critical than for JPA entities but can be useful.
    @Override
    public String toString() {
        return "ExampleEntityDto{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", description='" + description + '\'' +
               '}';
    }

    // Note: The LLM should generate multiple DTOs per entity as needed:
    // 1. A DTO for API responses (e.g., UserDto, ProductDto) - typically includes ID and might nest other DTOs.
    // 2. A DTO for creation requests (e.g., UserCreateDto, ProductCreateDto) - omits ID, includes fields needed for creation, possibly with validation.
    // 3. A DTO for update requests (e.g., UserUpdateDto, ProductUpdateDto) - fields are often optional, includes fields that can be updated.
    // The example above is a generic placeholder that mixes concepts; the LLM should generate specific ones.
}
// The LLM should ensure that the DTOs are tailored to the specific entity and its use case,
// including appropriate validation annotations and possibly using Lombok for boilerplate reduction.
// The LLM should also consider generating a Mapper class or using a library like MapStruct or ModelMapper