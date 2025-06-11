// Example: templates/springboot/ExampleService.java
package com.example.generated.service; // LLM should place services in a 'service' sub-package

import com.example.generated.model.ExampleEntity; // LLM should import the correct Entity
import com.example.generated.repository.ExampleRepository; // LLM should import the correct Repository
import com.example.generated.dto.ExampleEntityDto; // LLM should import the correct DTO
// LLM should also import specific request DTOs like ExampleEntityCreateDto, ExampleEntityUpdateDto
// import com.example.generated.dto.ExampleEntityCreateDto;
// import com.example.generated.dto.ExampleEntityUpdateDto;
// import com.example.generated.exception.ResourceNotFoundException; // A custom exception (good practice)

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // For managing transactions

// import org.modelmapper.ModelMapper; // Optional: if using ModelMapper for DTO-entity conversion

import java.util.List;
import java.util.stream.Collectors;
// import java.util.Optional;

@Service
public class ExampleService { // LLM should rename this (e.g., UserService, ProductService)

    private final ExampleRepository exampleRepository; // LLM should inject the correct repository
    // private final ModelMapper modelMapper; // Optional: if using ModelMapper

    @Autowired
    public ExampleService(ExampleRepository exampleRepository /*, ModelMapper modelMapper (if used) */) {
        this.exampleRepository = exampleRepository;
        // this.modelMapper = modelMapper;
    }

    // --- Create Operation ---
    @Transactional // Ensures the operation is atomic
    public ExampleEntityDto createExampleEntity(/* ExampleEntityCreateDto createDto */ String name, String description) {
        // LLM should adapt parameters to use a specific Create DTO (e.g., ExampleEntityCreateDto)
        
        // Example: if using a Create DTO
        // ExampleEntity entity = modelMapper.map(createDto, ExampleEntity.class);
        // For simple cases without ModelMapper:
        ExampleEntity entity = new ExampleEntity();
        entity.setName(name); // Assuming 'name' comes from createDto.getName()
        entity.setDescription(description); // Assuming 'description' comes from createDto.getDescription()
        // Set other fields from createDto as needed

        ExampleEntity savedEntity = exampleRepository.save(entity);
        
        // Map saved entity back to a response DTO
        // return modelMapper.map(savedEntity, ExampleEntityDto.class);
        // Manual mapping for example:
        return convertToDto(savedEntity);
    }

    // --- Read Operations ---
    @Transactional(readOnly = true) // readOnly=true can optimize read operations
    public List<ExampleEntityDto> getAllExampleEntities() {
        return exampleRepository.findAll()
                .stream()
                // .map(entity -> modelMapper.map(entity, ExampleEntityDto.class))
                .map(this::convertToDto) // Manual mapping
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExampleEntityDto getExampleEntityById(Long id) { // LLM should use correct ID type
        ExampleEntity entity = exampleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entity not found with id: " + id)); // LLM should use a custom ResourceNotFoundException
                // .orElseThrow(() -> new ResourceNotFoundException("ExampleEntity", "id", id));
        
        // return modelMapper.map(entity, ExampleEntityDto.class);
        return convertToDto(entity);
    }

    // Example: Find by a specific field (if repository method exists)
    // @Transactional(readOnly = true)
    // public ExampleEntityDto getExampleEntityByName(String name) {
    //     ExampleEntity entity = exampleRepository.findByName(name) // Assuming findByName exists in repository
    //             .orElseThrow(() -> new ResourceNotFoundException("ExampleEntity", "name", name));
    //     return convertToDto(entity);
    // }


    // --- Update Operation ---
    @Transactional
    public ExampleEntityDto updateExampleEntity(Long id, /* ExampleEntityUpdateDto updateDto */ String newName, String newDescription) {
        // LLM should adapt parameters to use a specific Update DTO (e.g., ExampleEntityUpdateDto)
        ExampleEntity existingEntity = exampleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entity not found with id: " + id)); // Use custom exception
                // .orElseThrow(() -> new ResourceNotFoundException("ExampleEntity", "id", id));

        // Update fields from updateDto
        // Example: if using an Update DTO
        // if (updateDto.getName() != null) existingEntity.setName(updateDto.getName());
        // if (updateDto.getDescription() != null) existingEntity.setDescription(updateDto.getDescription());
        // Manual update for example:
        existingEntity.setName(newName);
        existingEntity.setDescription(newDescription);
        // Set other updatable fields

        ExampleEntity updatedEntity = exampleRepository.save(existingEntity);
        // return modelMapper.map(updatedEntity, ExampleEntityDto.class);
        return convertToDto(updatedEntity);
    }

    // --- Delete Operation ---
    @Transactional
    public void deleteExampleEntity(Long id) { // LLM should use correct ID type
        if (!exampleRepository.existsById(id)) {
            throw new RuntimeException("Entity not found with id: " + id); // Use custom exception
            // throw new ResourceNotFoundException("ExampleEntity", "id", id);
        }
        exampleRepository.deleteById(id);
    }


    // --- Helper method for DTO conversion (if not using ModelMapper) ---
    // LLM should generate this based on the DTO and Entity fields.
    private ExampleEntityDto convertToDto(ExampleEntity entity) {
        if (entity == null) return null;
        ExampleEntityDto dto = new ExampleEntityDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        // Map other fields, including fields from related entities if the DTO requires them
        // e.g., if ExampleEntityDto has a field for a related entity's name:
        // if (entity.getRelatedEntity() != null) {
        //     dto.setRelatedEntityName(entity.getRelatedEntity().getName());
        // }
        return dto;
    }

    // LLM might also need helper methods to convert from CreateDto/UpdateDto to Entity,
    // especially if not using a mapping library like ModelMapper.
    // private ExampleEntity convertCreateDtoToEntity(ExampleEntityCreateDto createDto) { ... }
}
// LLM should ensure that the service methods are tailored to the specific entity and its use case,
// including appropriate error handling and transaction management.