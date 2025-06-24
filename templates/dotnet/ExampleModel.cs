// templates/dotnet/ExampleModel.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExampleProject.Models // LLM will replace 'ExampleProject' with the generated project name
{
    // The LLM should generate a class like this for each entity in the schema.
    // The class name should be the PascalCase version of the entity name.
    public class ExampleModel 
    {
        [Key] // Marks this property as the primary key
        public int Id { get; set; } // The LLM should choose the correct type (int, long, Guid)

        [Required] // Example of a data annotation for validation
        [StringLength(100)]
        public string Name { get; set; }

        // --- Example Relationships ---

        // Example for a Many-to-One relationship (e.g., this entity belongs to a 'ParentEntity')
        // The foreign key property
        // public int ParentEntityId { get; set; } 
        // The navigation property
        // public ParentEntity ParentEntity { get; set; }

        // Example for a One-to-Many relationship (e.g., this entity has a collection of 'ChildEntity')
        // public ICollection<ChildEntity> Children { get; set; } = new List<ChildEntity>();

    }
}
