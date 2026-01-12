# Manque Corretaje

Este proyecto es una aplicación web para la gestión de propiedades, desarrollada con **Django** (Backend) y **Angular** (Frontend).

## Requisitos Previos

Para desplegar este sistema en un nuevo entorno (local o servidor), necesitas tener instalado:

1.  **Python** (3.10 o superior)
2.  **Node.js** (v18 o superior) y **npm**
3.  **MySQL Server**
4.  **Git**

---

## Configuración del Entorno

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Emiliuzzz/Manque_Corretajes.git
cd manque_corretaje
```

### 2. Configuración de la Base de Datos (MySQL)

Asegúrate de que tu servidor MySQL esté corriendo. Debes crear una base de datos vacía para el proyecto. Puedes hacerlo desde tu cliente MySQL favorito (Workbench, DBeaver, CLI):

```sql
CREATE DATABASE manque_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configuración del Backend (Django)

Navega a la carpeta del backend:

```bash
cd backend
```

#### Crear y activar entorno virtual

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Instalar dependencias

```bash
pip install -r requirements.txt
```

#### Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/` (al mismo nivel que `manage.py`) y define las siguientes variables. Ajusta los valores según tu configuración local de MySQL:

```env
DEBUG=True
SECRET_KEY=tu_clave_secreta_segura
DB_NAME=manque_db
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_HOST=localhost
DB_PORT=3306
```

#### Migraciones y Usuario Admin

Una vez configurado el `.env`, ejecuta las migraciones para crear las tablas en la base de datos:

```bash
python manage.py migrate
```

Crea un superusuario para acceder al panel de administración:

```bash
python manage.py createsuperuser
```
*(Sigue las instrucciones en pantalla para definir usuario y contraseña)*

O alternativamente, si existe el script de ayuda:
```bash
python crear_admin.py
```

#### Ejecutar el Servidor Backend

```bash
python manage.py runserver
```
El backend estará corriendo en `http://127.0.0.1:8000/`.

---

### 4. Configuración del Frontend (Angular)

Abre una nueva terminal y navega a la carpeta del frontend:

```bash
cd frontend
```

#### Instalar dependencias

```bash
npm install
```

#### Ejecutar el Servidor de Desarrollo

```bash
npm start
```
O usando el comando directo de Angular CLI:
```bash
ng serve
```

La aplicación estará disponible en `http://localhost:4200/`.

---

## Despliegue en Producción (Resumen)

Para un entorno de producción, considera lo siguiente:

*   **Backend:**
    *   Cambiar `DEBUG=False` en el `.env`.
    *   Usar un servidor WSGI como `gunicorn` o `waitress`.
    *   Configurar archivos estáticos con `python manage.py collectstatic`.
*   **Frontend:**
    *   Generar los archivos de producción: `npm run build`.
    *   Servir la carpeta `dist/` usando Nginx, Apache, o integrarlo con Django.

## Estructura del Proyecto

*   `/backend`: API RESTful con Django.
*   `/frontend`: SPA con Angular.
