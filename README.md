# Modelo de Dijkstra

Aplicación web para construir un grafo ponderado y encontrar la ruta más corta con el algoritmo de Dijkstra. Permite editar nodos y aristas en un lienzo, ver el resultado y seguir la ejecución paso a paso.

**Demo:** [https://marlon-figueroa.github.io/modelo_dijkstra/](https://marlon-figueroa.github.io/modelo_dijkstra/)

Autor: **Marlon Ernesto Figueroa Fuentes**

## Características

- Lienzo interactivo para crear, conectar y mover nodos
- Grafos dirigidos o no dirigidos, con pesos editables
- Cálculo de la ruta mínima entre origen y destino
- Animación paso a paso (inicialización, selección, relajación y visita)
- Tabla de distancias y predecesores, más un registro de cada paso
- Grafo de ejemplo listo para probar (A → G)
- Tema claro y oscuro, con persistencia en `localStorage`

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Uso

Arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

Para generar una versión de producción:

```bash
npm run build
npm run preview
```

## Cómo usar la aplicación

1. **Añadir nodo**: haz clic en el lienzo para crear nodos (A, B, C…).
2. **Conectar**: pulsa dos nodos para crear una arista e indica su peso.
3. **Mover**: arrastra los nodos para reorganizar el grafo.
4. Elige **Origen** y **Destino**, o pulsa un nodo para origen y otro para destino (doble clic cambia el destino).
5. Pulsa **Calcular ruta** para ver el camino mínimo, o **Paso a paso** para animar el algoritmo.
6. Activa **Dirigido** si las aristas deben tener sentido único.
7. **Grafo ejemplo** carga un grafo de demostración; **Limpiar** borra todo.

Atajos:

- `Delete` / `Backspace`: elimina el nodo seleccionado y sus aristas
- `Escape`: cierra el diálogo de peso o cancela la selección
- Clic en el peso de una arista: edita el costo

Leyenda del lienzo:

| Color   | Significado   |
|---------|---------------|
| Azul    | Origen        |
| Rojo    | Destino       |
| Celeste | Nodo actual   |
| Verde   | Visitado      |
| Ámbar   | Ruta mínima   |

## Estructura del proyecto

```text
modelo_dijkstra/
├── index.html          # Interfaz
├── src/
│   ├── main.js         # Punto de entrada
│   ├── app.js          # Lienzo, edición del grafo y visualización
│   ├── dijkstra.js     # Algoritmo y generación de pasos
│   ├── theme.js        # Tema claro/oscuro
│   └── style.css       # Estilos
├── vite.config.js
└── package.json
```

## Algoritmo

Dijkstra calcula distancias mínimas desde un origen en un grafo con pesos no negativos:

1. Inicializa la distancia del origen en `0` y el resto en `∞`.
2. Elige el nodo no visitado con menor distancia tentativa.
3. Relaja las aristas hacia sus vecinos: si el nuevo costo es menor, actualiza distancia y predecesor.
4. Marca el nodo como visitado (su distancia ya es definitiva).
5. Repite hasta alcanzar el destino o no quedar nodos alcanzables.
6. Reconstruye la ruta recorriendo los predecesores.

La implementación está en `src/dijkstra.js` y emite un historial de pasos para la animación y la tabla de distancias.

## GitHub Pages

Cada push a `main` construye el proyecto con Vite y lo publica en GitHub Pages. La URL queda:

[https://marlon-figueroa.github.io/modelo_dijkstra/](https://marlon-figueroa.github.io/modelo_dijkstra/)

El flujo está en `.github/workflows/deploy-pages.yml`. También se puede lanzar a mano desde la pestaña **Actions**.
