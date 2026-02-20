# Planificador de Horarios - FCA UNAC

Este proyecto ha sido refactorizado para utilizar una arquitectura modular moderna con **ES Modules** y un diseño visual mejorado.

## 🚀 Despliegue en GitHub Pages

Este proyecto está *listo* para GitHub Pages. Sigue estos pasos:

1.  Sube este código a tu repositorio de GitHub.
2.  Ve a **Settings** (Configuración) > **Pages**.
3.  En **Source**, selecciona `Deploy from a branch`.
4.  Selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
5.  Haz clic en **Save**.

En unos minutos, tu página estará disponible en `https://tu-usuario.github.io/tu-repositorio/`.

## 💻 Ejecución Local

**IMPORTANTE**: Debido al uso de Módulos ES (`import`/`export`), **no puedes** simplemente hacer doble clic en `index.html`. Necesitas un servidor local.

### Opción A: VS Code (Recomendado)
1.  Instala la extensión **Live Server**.
2.  Haz clic derecho en `index.html` y selecciona "Open with Live Server".

### Opción B: Python
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
python -m http.server
```
Luego abre `http://localhost:8000`.

## 🛠 Estructura
- `/js/modules/`: Contiene la lógica dividida (`Schedule`, `UI`, `Storage`, `Export`).
- `/js/main.js`: Punto de entrada que inicializa la app.
- `/data/courses.js`: Datos de los cursos (formato Módulo).
- `/css/style.css`: Estilos personalizados y utilidades para animaciones.
