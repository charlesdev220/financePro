# Skill: API Test Generator

Genera tests de integración para endpoints del API basándose en `contracts/openapi.yaml`.  
Recibís: **$ARGUMENTS** (endpoint o tag a testear, ej: `auth`, `properties`, `/api/v1/auth/login`).

## Qué hacer

1. Leer `contracts/openapi.yaml` y extraer los endpoints del tag/path indicado.
2. Para cada endpoint identificar: método HTTP, path, request body schema, response codes (200, 201, 400, 401, 404).
3. Generar test de integración Spring Boot + MockMvc.
4. Generar test E2E Cypress para los flujos críticos.

## Template Spring Boot — @WebMvcTest

```java
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("POST /api/v1/auth/login - 200 con credenciales válidas")
    void login_shouldReturn200_whenCredentialsValid() throws Exception {
        // Given
        UserEntity user = UserEntity.builder()
            .email("test@example.com")
            .password("{noop}password123")
            .build();
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "{noop}password123")).thenReturn(true);
        when(jwtService.generateToken(any(), any())).thenReturn("mock-jwt-token");

        // When / Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "test@example.com", "password": "password123" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.expiresIn").isNumber());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - 401 con credenciales inválidas")
    void login_shouldReturn401_whenCredentialsInvalid() throws Exception {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "wrong@example.com", "password": "bad" }
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - 400 con body inválido")
    void login_shouldReturn400_whenBodyInvalid() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }
}
```

## Template Cypress — Flujos Críticos

```typescript
// cypress/e2e/auth.cy.ts
describe('Auth Flow', () => {
  it('should login and redirect to search', () => {
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: { token: 'mock-token', expiresIn: 86400 }
    }).as('loginRequest');

    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/search');
  });

  it('should show error on invalid credentials', () => {
    cy.intercept('POST', '/api/v1/auth/login', { statusCode: 401 }).as('loginFailed');

    cy.visit('/login');
    cy.get('input[type="email"]').type('bad@example.com');
    cy.get('input[type="password"]').type('wrong');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginFailed');
    cy.contains('Email o contraseña incorrectos').should('be.visible');
  });
});
```

## Reglas
- Siempre testear: happy path + error principal (400/401/404) + body inválido.
- Errores de API deben devolver `ProblemDetail` — verificar `content-type: application/problem+json`.
- Tests de Controller: `@WebMvcTest` (no `@SpringBootTest` — es más rápido).
- Cypress: usar `cy.intercept()` para mockear el backend en E2E — nunca llamadas reales en CI.
- Un test por escenario del `openapi.yaml`.