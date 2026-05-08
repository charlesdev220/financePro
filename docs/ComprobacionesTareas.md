
en un nuevo sdd implementa estas tareas: 

'/Users/charles/Documents/apps/FinancePro/tools/data-import' '/Users/charles/Documents/apps/FinancePro/recursos/monefy_database-2026-04-11_21-12-08.db' quiero que me crees un md con el parseo hacia       
  nuestra bd en google sheet para estos datos, el data-import es un script para ello, quiero que estos datos se guarden para el usuario chalme220@gmail.com, pero antes quiero ver que se vayan a guardar     
  bien, con sus categorias correctas, fechas correct
  as, etc                                                                                                                                                   
  
- quiero que crees un md con mi estilo de ux actual. Que tipo de botones uso, que tipo de listas, que tipo de iconos, que tipografia utilizo, que graficos, como inserto informacion, la edito. En definitiva que sea el manual de ux que necesito para trabajar conmigo

REGLAS
- no se puede utilizar en los ts 'rgba(255, 165, 0, 1)','rgba(0, 255, 242, 1)' o #9E9E9E', si o si no se puede usar el color directamente, se tiene que crear una constante en el archivo de constantes. (projections.component.ts) 
- no se permiten interfaces dentro de componentes o servicios. estas deben tener su propio fichero .ts en la carpeta models. (analytics.service.ts)
- lista de colores e iconos deben estar en una constante  (category-form.component.ts)
- como quedaria el proyecto paquetizado si utilizamos arquitectura hexagonal?


  Pendiente manual (requieren herramientas nativas):                                                                                                                                                          
  - ⏳ TASK-03 — npm run cap:add:android → necesita Android Studio + ANDROID_HOME                                                                                                                             
  - ⏳ TASK-04 — npm run cap:add:ios → necesita Xcode.app 15+ + CocoaPods                                                                                                                                     
  - ⏳ TASK-06/07/08 — cap sync + verificaciones de estructura nativa                                                                                                                                         
                                                                             

  Los comandos están listos en package.json. Cuando tengas el entorno nativo, es tan simple como:                                                                                                             
  cd frontend                                                                                                                                                                                                 
  npm run cap:add:android   # o cap:add:ios                                                                                                                                                                   
  npm run cap:sync                                                                              