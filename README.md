# AORA · Avisos desde el móvil

Formulario público: https://iirgithub.github.io/WEB/.

Selecciona texto, inicio y duración en minutos u horas, o fecha final. Revisa el aviso y pulsa Enviar.

## Acceso

Por decisión del usuario, cualquiera que tenga el enlace puede enviar avisos sin identificarse, sin clave, cuenta ni sesión. El receptor no exige credenciales. CORS restringe los navegadores al origen configurado, pero no es autenticación ni impide peticiones de otros clientes.

## Estado

Web publicada. Envío pendiente de conectar una entrada HTTPS en GROS y su dirección en `config.js`. Hasta entonces se puede preparar y revisar el aviso, pero no enviarlo.

Se conservan la validación del texto y fechas, la conversión de horas a minutos, los identificadores para reintentos y el límite global de 20 avisos nuevos por minuto en GROS. Los nodos de GROS y su configuración se mantienen fuera de este repositorio público.

Una respuesta de aceptación de GROS no confirma la entrega del correo ni la programación en SERT.

## Publicación

GitHub Pages: rama `main`, carpeta raíz.
