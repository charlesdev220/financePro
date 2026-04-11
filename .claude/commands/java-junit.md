# Skill: Java JUnit 5

Aplica estas directrices al escribir o revisar tests en Java para este proyecto.

## Estructura de Tests

- Clases de test con sufijo `Test` (ej: `PropertyServiceTest`).
- Patrón **Given-When-Then** (AAA: Arrange-Act-Assert).
- Nombre de método: `methodName_should_expectedBehavior_when_scenario`.
- Un comportamiento por test — nunca testear múltiples condiciones en uno.
- Tests independientes y reproducibles (sin dependencias entre ellos).

## Anotaciones Esenciales

```java
@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @InjectMocks
    private PropertyService propertyService;

    @BeforeEach
    void setUp() { /* setup común */ }

    @Test
    @DisplayName("should return property when ID exists")
    void findById_shouldReturnProperty_whenIdExists() {
        // Given
        UUID id = UUID.randomUUID();
        PropertyEntity entity = PropertyEntity.builder().id(id).title("Test").build();
        when(propertyRepository.findById(id)).thenReturn(Optional.of(entity));

        // When
        PropertyDTO result = propertyService.findById(id);

        // Then
        assertThat(result.getTitle()).isEqualTo("Test");
        verify(propertyRepository).findById(id);
    }

    @Test
    @DisplayName("should throw when property not found")
    void findById_shouldThrow_whenNotFound() {
        // Given
        UUID id = UUID.randomUUID();
        when(propertyRepository.findById(id)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(PropertyNotFoundException.class, () -> propertyService.findById(id));
    }
}
```

## Tests de Integración con TestContainers

```java
@SpringBootTest
@Testcontainers
class PropertyRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgis/postgis:15-3.3");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private PropertyRepository propertyRepository;

    @Test
    void shouldSaveAndRetrieveProperty() {
        // test con base de datos real
    }
}
```

## Tests Parametrizados

```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "  "})
@DisplayName("should reject blank titles")
void createProperty_shouldFail_whenTitleIsBlank(String title) {
    assertThrows(ValidationException.class,
        () -> propertyService.create(new PropertyCreateDTO(title, null, null)));
}
```

## Reglas del Proyecto

- Usar **AssertJ** para aserciones fluidas: `assertThat(result).isEqualTo(expected)`.
- `@Tag("unit")` para tests unitarios, `@Tag("integration")` para tests de integración.
- Tests de `Controller`: usar `@WebMvcTest` con `MockMvc`.
- Tests de `Repository`: usar `@DataJpaTest` + TestContainers con PostGIS.
- Tests de `Service`: usar `@ExtendWith(MockitoExtension.class)` con mocks.
- Cobertura mínima: **80%** en capas de dominio (excluir DTOs y entidades).
- `assertAll()` para agrupar aserciones relacionadas.