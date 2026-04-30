[Image #5] en web cuando elija un filtro, añadele una x encima del filtro en cuestion para que pueda borrarlos mas facilmente  

[Image #10] quiero que sea mas interactivo, basate en el seleccionar fotos de la biblioteca de fotos del iphone 

tenemos ahora una nueva logica de implementacion que empieza en @CLAUDE.md, quiero que analices en su totalidad y de manere minuiciosa el proyecto y encuentre discrepancias con el nuevo flujo de trabajo puesto en @CLAUDE.md y sus flujos internos, quiero que 
  inicialices un nuevo flujo sdd para corregir las desviaciones de implementacion

dale, añade que si es necesario se creen varios ficheros de task si la migracion a jest es muy cosatosa, estos ficheros task se van implementando uno a uno preguntandome antes de pasar al siguiente   

en un nuevo sdd implementa estas tareas: 
------
- enlazarla con wasap, añadirle un bor que inserte y responda, 

- Antes del task mostrar un diagrama de flujo de flujos a tocar y qye se resuelve

- comprobar el listado ordenado por fecha en la pantalla de transacciones en modo lista

- añadir una pila que se va recargando a medida que vas llegando al limite de gasto en cada categoria como el tabs de presupuesto pero en el dashboard

- añadir la fecha de la transaccion con el hora en la pantalla de detalles de transaccion

- el ver todos del dashboard debe llevar al tab de transacciones

- el Gasto por categoría de Analitics es de tipo columna no de tipo tarta como la grafica de ingresos vs Gastos

en un nuevo sdd implementa estas tareas: 

- la lista de movimientos del dashboard no esta ordenada de la misma forma que el tab de movimientos 

- la pila de porcentaje por categoria delante del icono no es la misma que el porcentaje total de todas las categorias, una cosa es el porcentaje que llevamos gastado en una categoria y otra es el porcentaje que representa esa categoria sobre el total de gastos de todas las categorias que es el que esta al lado del monto total que lleva esa categoria

-quiero analizar otras propuetas: A) quiero crear un md con la documentacion funcional del proyecto, por tabs con su tratamiento de datos entre       
  features y la bd, este debe ser lo primero que vea el agente cuando lance una correccion o nueva implementacion. B) quiero un agente que enriquesca  
  los prompts que envio ya sea una correccion o una nueva implementacion basandose en el fichero md creado en la opcion A. C) quiero eliminar el tab   
  de presupuesto y trasladar su funcionalidad al tab de mas tomando como patron las opciones existentes. D) utilizar el componente entero del tab      
  movimientos en el dashboard, elimiinando asi el tab de movimiento. E) quiero que el editar presupuesto sea mas entendible, las opciones deben ser    
  presupuesto indefinido, presupuesto desde una fecha hasta otra fecha, y desabilitar presupuesto lo que incluye que no se muestre su barra de         
  progreso en el dashboard como las demas categorias de gasto. todas estas propuestas deben ser añadidas a                                             
  '/Users/charles/Documents/apps/FinancePro/WORKSPACES_PLAN.md' 





- analiza detenidamente todos los state y generame un fichero md con toda la logica, el flujo de datos para un programador junior angular 


en un nuevo sdd implementa estas tareas: 
- se debe permitir elegir cuando empieza un nuevo mes, por defecto es del dia 1 al ultimo dia del mes, pero se puede cambiar por ejemplo para que empiece el dia 5 y termine el dia 4 del siguiente mes. 

- en settings debo poder cambiar de espacios, asi como el listado de espacios ya guardados. si se cambia el espacio actual se debe mostrar las transacciones del espacio elegido 

- no funciona el filtro de periodos en dashboard, no muestra las transacciones del dia actual, o semana actual, solo muestra del mes. 

- se debe añadir la opcion de cambiar de mes en dashboard, ver el mes siguiente y anterior

- los test ya no utilizaremos karma con jasmin, ahora usamos jest con angular testing library y se tendra que hacer la migracion de los test actuales, la migracion la haremos poco a poco 