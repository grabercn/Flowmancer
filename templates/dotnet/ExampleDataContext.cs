// templates/dotnet/ExampleDataContext.cs
using Microsoft.EntityFrameworkCore;
using ExampleProject.Models; // LLM will replace 'ExampleProject'

namespace ExampleProject.Data // LLM will replace 'ExampleProject'
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options) : base(options)
        {
        }

        // The LLM should add a DbSet for each entity in the schema.
        // The property name should be the plural form of the entity name.
        // For example, for a "User" entity: public DbSet<User> Users { get; set; }
        // For a "Product" entity: public DbSet<Product> Products { get; set; }
        public DbSet<ExampleModel> ExampleModels { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // The LLM can be instructed to add fluent API configurations here
            // for complex relationships, composite keys, or specific constraints,
            // though data annotations on the models are often sufficient for the MVP.

            // Example for a many-to-many relationship join table:
            // modelBuilder.Entity<JoinEntity>()
            //     .HasKey(je => new { je.EntityAId, je.EntityBId });
        }
    }
}
