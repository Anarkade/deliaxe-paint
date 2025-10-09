Objetivo
========
Crear una transición segura en todo el proyecto para reemplazar colores codificados (hex) por clases semánticas CSS ya añadidas en `src/index.css`.

Clases añadidas
----------------
- color-bg-highlight -> #202225
- color-bg-main -> #1e1d20
- color-highlight-main -> #721b35
- color-text-subtitle -> #f8fafc
- color-text-common -> #aea99d

Resumen de la tarea
--------------------
1) Buscar en todo el repositorio las ocurrencias de los colores hex (mayúsculas/minúsculas) listados arriba.
2) Revisar el contexto de cada ocurrencia (background, border, color inline, style en JSX/HTML, CSS/SCSS/LESS, Tailwind arbitrary colors, cadenas en JS/TS).
3) Reemplazar la ocurrencia por la clase semántica correspondiente, preferiblemente aplicando la clase en el elemento HTML/JSX en lugar de modificar reglas globales cuando sea posible.
4) Hacer pruebas visuales (dev server) y ejecutar el build para verificar que no se ha roto nada.
5) Commit por lote (por ejemplo, por paquete de componentes) con mensajes claros: "refactor(colors): replace #202225 by .color-bg-highlight in <componentes>".

Mapeo rápido (reemplazo sugerido)
---------------------------------
- #202225  => .color-bg-highlight
- #1e1d20  => .color-bg-main
- #721b35  => .color-highlight-main
- #f8fafc  => .color-text-subtitle
- #aea99d  => .color-text-common

Patrones de búsqueda recomendados
---------------------------------
Es importante cubrir distintas variantes que se pueden encontrar (mayúsculas/minúsculas, espacios, comillas, CSS inline):

Expresiones regulares (case-insensitive):
- #202225  -> (?i)#202225
- #1e1d20  -> (?i)#1e1d20
- #721b35  -> (?i)#721B35
- #f8fafc  -> (?i)#F8FAFC
- #aea99d  -> (?i)#AEA99D

Ejemplos de comandos (PowerShell)
----------------------------------
Buscar archivos que contienen el color (PowerShell):

```powershell
Select-String -Path . -Pattern "#202225" -SimpleMatch -List | Select-Object Path -Unique
```

Buscar con regex (case-insensitive):

```powershell
Select-String -Path . -Pattern "(?i)#202225" -AllMatches -List | Select-Object Path, LineNumber, Line
```

Si tienes ripgrep instalado (recomendado para proyectos grandes):

```powershell
rg "(?i)#202225" --glob '!node_modules' --hidden
```

Sustitución segura (manual en VSCode o con ripgrep + sed)
-------------------------------------------------------
- Recomiendo abrir los resultados en VSCode (Search) y revisar cada ocurrencia antes de reemplazar.
- Si automatizas: hazlo por lotes pequeños y crea un branch para cada cambio importante.

Ejemplo (ripgrep + powershell replace por archivo) — usar con precaución:

```powershell
# Para cada fichero encontrado, reemplazar en su contenido (haz backup antes)
$files = rg "(?i)#202225" --files
foreach ($f in $files) {
  (Get-Content $f) -replace '(?i)#202225', '/*REPLACE_BY_CLASS: color-bg-highlight */' | Set-Content $f
}
```

Notas: esto escribe texto en el archivo; la intención es marcar lugares para revisar y convertir manualmente a clases en contextos JSX/CSS.

Guía de reemplazo por tipo de archivo
-------------------------------------
- CSS/SCSS/LESS
  - Preferible: sustituir la regla que contiene el color por la clase semántica en el HTML/JSX que usa esa regla.
  - Alternativa: si el color está en una clase CSS muy utilizada, crear/reutilizar una clase (ya lo hemos hecho) y reemplazar la declaración por `@apply color-bg-highlight` si usas Tailwind, o por `background-color: var(--...);` según el sistema de variables.

- JSX/TSX/HTML (atributo style)
  - Reemplazar: <div style={{ background: '#202225' }}>  ->  <div className="color-bg-highlight">  (asegúrate de no perder otras propiedades de `style`)

- Inline color en atributos (por ejemplo, svg fill/stroke)
  - Si el color aplica semánticamente al fondo/texto, usar la clase. En SVGs embebidos, a veces se necesita mantener fill, pero puedes usar CSS para seleccionar y aplicar la clase.

Pruebas y QA
-----------
- Ejecutar servidor de desarrollo:

```powershell
npm run dev
```

- Ejecutar build:

```powershell
npm run build
```

- Revisar visualmente componentes afectados y la página completa.
- Revisar que `public/version.json` se actualice si corresponde y que no haya nuevos errores de linter/TypeScript.

Checklist para cada PR
----------------------
- [ ] Todos los cambios de reemplazo revisados manualmente
- [ ] Dev server inicia sin errores
- [ ] Build completo pasa sin errores
- [ ] Commit y PR con descripción detallada y captura(s) de pantalla si hay cambios visuales

Notas finales
-------------
- Si se prefieren utilidades Tailwind en lugar de clases CSS globales, una mejora posterior sería declarar estas variables como colores en `tailwind.config.ts` para poder usar clases como `bg-color-bg-highlight` o `text-color-text-subtitle`.
- Esta tarea puede ser automatizada parcialmente, pero debe realizarse con cuidado para no romper estilos puntuales (por ejemplo, gradientes, borders, sombras que usen el color como parte de la fórmula).

Si quieres, puedo:
- Ejecutar una búsqueda automática de las 5 hex-ocurrencias y preparar un PR con propuestas de reemplazo fragmentadas por componentes (opción segura), o
- Ejecutar un reemplazo directo en todos los ficheros (no recomendado sin revisión).

Indica qué prefieres y lo hago.
