
en un nuevo sdd implementa estas tareas: 

- quiero que crees un md con mi estilo de ux actual. Que tipo de botones uso, que tipo de listas, que tipo de iconos, que tipografia utilizo, que graficos, como inserto informacion, la edito. En definitiva que sea el manual de ux que necesito para trabajar conmigo

REGLAS
- no se puede utilizar en los ts 'rgba(255, 165, 0, 1)','rgba(0, 255, 242, 1)' o #9E9E9E', si o si no se puede usar el color directamente, se tiene que crear una constante en el archivo de constantes. (projections.component.ts) 
- no se permiten interfaces dentro de componentes o servicios. estas deben tener su propio fichero .ts en la carpeta models. (analytics.service.ts)
- lista de colores e iconos deben estar en una constante  (category-form.component.ts)