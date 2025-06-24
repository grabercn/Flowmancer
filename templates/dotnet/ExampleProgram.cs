// templates/dotnet/ExampleProgram.cs
using Microsoft.EntityFrameworkCore;
using ExampleProject.Data; // LLM will replace 'ExampleProject'

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// Configure the DbContext
// Use In-Memory Database for this example.
// The LLM can be instructed to switch this to use a connection string for other databases.
builder.Services.AddDbContext<DataContext>(options =>
{
    options.UseInMemoryDatabase("MyInMemoryDb"); 
});


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services to allow requests from the frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Use the CORS policy
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

app.Run();
