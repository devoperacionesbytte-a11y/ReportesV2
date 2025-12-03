// Mostrar alerta en el modal
function mostrarAlertaModal(mensaje, tipo = "error") {
  const alertBox = document.getElementById("modalAlert");
  alertBox.style.display = "block";

  if (tipo === "error") {
    alertBox.style.backgroundColor = "#f8d7da";
    alertBox.style.color = "#721c24";
    alertBox.style.border = "1px solid #f5c6cb";
  } else if (tipo === "aviso") {
    alertBox.style.backgroundColor = "#fff3cd";
    alertBox.style.color = "#856404";
    alertBox.style.border = "1px solid #ffeeba";
  } else if (tipo === "exito") {
    alertBox.style.backgroundColor = "#d4edda";
    alertBox.style.color = "#155724";
    alertBox.style.border = "1px solid #c3e6cb";
  }

  alertBox.innerHTML = mensaje;

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Mostrar panel de reporte
function mostrarReporte() {
  document.getElementById("seleccionPanel").style.display = "none";
  document.getElementById("reportePanel").style.display = "block";
  establecerFechaActual(); // función que pone la fecha actual en el campo #fecha
}

// Mostrar modal de consulta
function mostrarModalConsulta() {
  document.getElementById("consultaModal").style.display = "block";
}

// Cerrar modal de consulta
function cerrarModalConsulta() {
  document.getElementById("consultaModal").style.display = "none";
  document.getElementById("ticketId").value = "";
}

// Volver al panel de selección
function volverSeleccion() {
  document.getElementById("reportePanel").style.display = "none";
  document.getElementById("resultadoCaso").style.display = "none";
  document.getElementById("seleccionPanel").style.display = "block";
}

// Definir la URL base del backend
const BASE_URL = window.location.origin; 
// Esto será http://localhost:3000 si entras desde tu propio PC,
// o http://192.168.5.14:3000 si entras desde otro PC en la red

// Variable global para guardar el ticket actual
let currentTicketId = null;

function consultarCaso() {
  const ticketId = document.getElementById("ticketId").value.trim();
  if (!ticketId || isNaN(ticketId)) {
    mostrarAlertaModal("⚠️ Por favor ingresa un ID de ticket válido", "aviso");
    return;
  }

  const contenido = document.getElementById("contenidoCaso");
  contenido.innerHTML = '<div class="loading">⏳ Cargando información del caso...</div>';

  // Llamada al backend
  fetch(`${BASE_URL}/api/tickets/${ticketId}`)
    .then(response => {
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      // Si el backend devuelve {ticket: {...}}, ajustamos
      const ticket = data.ticket || data;

      // 👇 Validar si el ticket tiene la etiqueta ByAccess
      const tieneByAccess = Array.isArray(ticket.tags) && ticket.tags.includes("byaccess");

      if (!tieneByAccess) {
        mostrarAlertaModal("⚠️ Este ticket no pertenece a ByAccess ⚠️", "aviso");
        contenido.innerHTML = "";
        return; // detenemos aquí el flujo
      }

      // Si sí pertenece a ByAccess, seguimos con el flujo normal
      currentTicketId = ticket.id;
      cerrarModalConsulta();
      mostrarDetallesCaso(ticket);
      consultarHistorico(ticket.id);

      // Cambiar paneles
      document.getElementById("seleccionPanel").style.display = "none";
      document.getElementById("resultadoCaso").style.display = "block";

      mostrarAlertaModal("✅ Ticket cargado correctamente", "exito");
    })
    .catch(error => {
      console.error("Error:", error);
      mostrarAlertaModal(`❌ No se pudo obtener el caso. ${error.message}`, "error");
      contenido.innerHTML = "";
    });
}

// Mostrar detalles del ticket
function mostrarDetallesCaso(ticket) {
  const contenido = document.getElementById("contenidoCaso");

  // Mapear estados y prioridades según lo que devuelva tu backend
  const estados = { 
    2:'Abierto', 
    3:'Pendiente', 
    4:'Resuelto', 
    5:'Cerrado', 
    6:'Esperando al cliente', 
    7:'Pendiente validación interna' 
  };
  const prioridades = {1:'Baja',2:'Media',3:'Alta',4:'Urgente'};

 const html = `
    <div class="caso-detalle">
      <div class="caso-item"><label>ID del Ticket:</label> <span>${ticket.id || 'N/A'}</span></div>
      <div class="caso-item"><label>Asunto:</label> <span>${ticket.subject || 'N/A'}</span></div>
      <div class="caso-item"><label>Estado:</label> <span>${estados[ticket.status] || ticket.status || 'Desconocido'}</span></div>
      <div class="caso-item"><label>Prioridad:</label> <span>${prioridades[ticket.priority] || ticket.priority || 'N/A'}</span></div>
      <div class="caso-item"><label>Categoría:</label> <span>${ticket.type || 'N/A'}</span></div>
      <div class="caso-item"><label>Cliente:</label> <span>${ticket.requester_name || 'N/A'}</span></div>
      <div class="caso-item"><label>Correo:</label> <span>${ticket.requester_email || 'N/A'}</span></div>
      <div class="caso-item"><label>Creado:</label> <span>${ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-CO') : 'N/A'}</span></div>
      <div class="caso-item"><label>Última actualización:</label> <span>${ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('es-CO') : 'N/A'}</span></div>
      <!-- Nuevo campo de Teléfono -->
      <div class="caso-item"><label>Teléfono:</label> <span>${ticket.phone || ticket.requester_phone || 'N/A'}</span></div>
      <div class="caso-item" style="grid-column: 1 / -1;">
        <label>Descripción:</label>
        <span style="white-space: pre-wrap;">${ticket.description || 'Sin descripción'}</span>
      </div>
    </div>
    <!-- Panel para añadir nota -->
    <div id="notaPanel" style="margin-top:20px;">
      <h3>Añadir Nota</h3>
      <textarea id="notaTexto" placeholder="Escribe una nota..." style="width:100%;height:80px;"></textarea><br>
      <input type="file" id="notaArchivo" multiple><br>
      <button onclick="agregarNota()">➕ Añadir Nota</button>
    </div>
  `;
contenido.innerHTML = html;
}

// Poner fecha actual en el campo #fecha
function establecerFechaActual() {
  const fechaInput = document.getElementById("fecha");
  if (fechaInput) {
    const ahora = new Date();
    fechaInput.value = ahora.toLocaleString("es-CO");
  }
}
// Añadir nota al ticket actual usando backend
function agregarNota() {
  const notaTexto = document.getElementById("notaTexto").value.trim();
  const archivos = document.getElementById("notaArchivo").files;

  if (!currentTicketId) {
    alert("Primero consulta un ticket antes de añadir una nota");
    return;
  }
  if (!notaTexto) {   
    alert("Por favor escribe el contenido de la nota");
    return;
  }

  const formData = new FormData();
  formData.append("body", notaTexto);
  formData.append("private", "true"); // string

  // 👇 Solo añadir si hay archivos
  if (archivos && archivos.length > 0) {
    for (let i = 0; i < archivos.length; i++) {
      formData.append("attachments[]", archivos[i], archivos[i].name);
    }
  }

  fetch(`${BASE_URL}/api/tickets/${currentTicketId}/notes`, {
    method: "POST",
    body: formData
  })
    .then(response => {
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      alert("✅ Nota añadida correctamente");
      console.log("Nota creada:", data);
      document.getElementById("notaTexto").value = "";
      document.getElementById("notaArchivo").value = "";
      // consultarHistorico(currentTicketId);
    })
    .catch(error => {
      console.error("Error al añadir nota:", error);
      alert("❌ No se pudo añadir la nota: " + error.message);
    });
}

window.agregarNota = agregarNota;


// Limpiar formulario de consulta/nota
function limpiarFormulario() {
  const ticketInput = document.getElementById("ticketId");
  if (ticketInput) ticketInput.value = "";
  const notaTexto = document.getElementById("notaTexto");
  if (notaTexto) notaTexto.value = "";
  const notaArchivo = document.getElementById("notaArchivo");
  if (notaArchivo) notaArchivo.value = "";
}

// Establecer fecha actual en el campo #fecha
function establecerFechaActual() {
  const ahora = new Date();
  const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                 "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const dia = ahora.getDate().toString().padStart(2, '0');
  const nombreDia = diasSemana[ahora.getDay()];
  const nombreMes = meses[ahora.getMonth()];
  const año = ahora.getFullYear();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes().toString().padStart(2, '0');
  const fechaFormateada = `${nombreDia} ${dia} de ${nombreMes}, ${año} a las ${hora}:${minutos}`;
  const campoFecha = document.getElementById('fecha');
  if (campoFecha) {
    campoFecha.value = fechaFormateada;
  }
}

// Actualizar datos del cliente según selección
function actualizarCliente() {
  const cliente = document.getElementById("cliente").value;
  const correo = document.getElementById("correo");
  const encargado = document.getElementById("encargado");

  if (cliente === "Invima") {
    correo.value = "ogutierreza@invima.gov.co";
    encargado.value = "Oscar Gutierrez";
  } else if (cliente === "Rosario") {
    correo.value = "mario.parra@urosario.edu.co";
    encargado.value = "Mario Parra";
  } else {
    correo.value = "";
    encargado.value = "";
  }
}

// Mostrar/ocultar campos de reparación
function mostrarCamposReparacion() {
  const requiere = document.getElementById("requiereReparacion").value;
  const reparacionDiv = document.getElementById("camposReparacion");
  reparacionDiv.style.display = requiere === "SI" ? "block" : "none";
  reparacionDiv.style.pageBreakBefore = "none";
}

// Configuración inicial al cargar la página
window.onload = function () {
  establecerFechaActual();

  const autenticado = localStorage.getItem("autenticado");
  const panelActivo = localStorage.getItem("panelActivo");

  if (autenticado === "true") {
    document.getElementById("loginPanel").style.display = "none";

    if (panelActivo === "reporte") {
      document.getElementById("reportePanel").style.display = "block";
      document.getElementById("seleccionPanel").style.display = "none";
    } else if (panelActivo === "seleccion") {
      document.getElementById("seleccionPanel").style.display = "block";
      document.getElementById("reportePanel").style.display = "none";
    } else {
      document.getElementById("seleccionPanel").style.display = "block";
      document.getElementById("reportePanel").style.display = "none";
    }
  } else {
    document.getElementById("loginPanel").style.display = "block";
    document.getElementById("reportePanel").style.display = "none";
    document.getElementById("seleccionPanel").style.display = "none";
  }
};
// Utilidad: limpiar inputs, selects y textareas dentro de un contenedor dado
function limpiarCamposDelContenedor(container) {
  if (!container) return;

  // Inputs de texto, número, etc.
  container.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="date"]').forEach(i => i.value = '');
  // Textareas
  container.querySelectorAll('textarea').forEach(t => t.value = '');
  // Selects
  container.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  // Checkboxes y radios
  container.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(c => c.checked = false);
}

// Cerrar modal si está abierto
function cerrarModalSiAbierto() {
  const modal = document.getElementById("encuestaModal");
  if (modal) modal.style.display = "none";
}

// Restaurar bloque de encuesta al estado inicial (botón)
function restaurarBloqueEncuesta() {
  const contenedor = document.getElementById("calificacionContainer");
  if (contenedor) {
    contenedor.innerHTML = '<button class="no-pdf" onclick="mostrarEncuesta()">Responder Encuesta</button>';
  }
}

// Limpiar imágenes y preview
function limpiarImagenes() {
  const inputImagen = document.getElementById("imagen");
  const preview = document.getElementById("preview");
  if (inputImagen) inputImagen.value = ''; // limpia selección de archivos
  if (preview) preview.innerHTML = '';     // limpia renderizado previo
}

// Si usas variables globales en el flujo (ej. encuestaData), límpialas aquí
function limpiarEstadoGlobal() {
  if (typeof encuestaData !== 'undefined') {
    encuestaData = null;
  }
}

// Si ya tienes esta función, puedes mantenerla, o usar la que propongo arriba
function limpiarFormulario() {
  // Intenta limpiar dentro del panel activo
  const reportePanel = document.getElementById("reportePanel");
  const seleccionPanel = document.getElementById("seleccionPanel");

  // Limpia campos en ambos por si acaso
  limpiarCamposDelContenedor(reportePanel);
  limpiarCamposDelContenedor(seleccionPanel);

  // Campos específicos que no están dentro de los paneles
  limpiarImagenes();
  restaurarBloqueEncuesta();
}

// Reinicia parámetros y limpia formulario
function reiniciarParametros() {
  // Mantener sesión autenticada (si lo deseas)
  localStorage.setItem("autenticado", "true");

  // Guardar cuál panel estaba activo (si lo necesitas luego)
  const reportePanel = document.getElementById("reportePanel");
  const seleccionPanel = document.getElementById("seleccionPanel");
  if (reportePanel && reportePanel.style.display === "block") {
    localStorage.setItem("panelActivo", "reporte");
  } else if (seleccionPanel && seleccionPanel.style.display === "block") {
    localStorage.setItem("panelActivo", "seleccion");
  }

  // Limpiezas de UI y estado
  cerrarModalSiAbierto();
  limpiarFormulario();
  limpiarEstadoGlobal();

  // Si tu app depende de recargar para reconstruir el estado, deja el reload.
  // Si no, quítalo.
  location.reload();
}
// Inicialización de firma en canvas
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('firmaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function ajustarTamañoCanvas() {
    canvas.width = 600;
    canvas.height = 200;
  }

  ajustarTamañoCanvas();

  let dibujando = false;
  let lastX = 0;
  let lastY = 0;
  let haFirmado = false;

  function inicializarCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.font = "40px Comic Sans MS";
    ctx.textAlign = "center";
    ctx.fillText("Firma Cliente", canvas.width / 2, canvas.height / 2);
    haFirmado = false;
  }

  inicializarCanvas();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  function dibujarLinea(x, y) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }

  // Eventos mouse
  canvas.addEventListener('mousedown', (e) => {
    dibujando = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    if (!haFirmado) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      haFirmado = true;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!dibujando) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dibujarLinea(x, y);
  });

  canvas.addEventListener('mouseup', () => dibujando = false);
  canvas.addEventListener('mouseout', () => dibujando = false);

  // Eventos touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dibujando = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    if (!haFirmado) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      haFirmado = true;
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!dibujando) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    dibujarLinea(x, y);
  });

  canvas.addEventListener('touchend', () => dibujando = false);

  // Función global para limpiar firma
  window.limpiarCanvas = function () {
    inicializarCanvas();
  };
});

function mostrarImagenes() {
  const input = document.getElementById("imagen");
  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  const files = Array.from(input.files).slice(0, 12);

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = "Imagen subida";
      img.style.maxWidth = "380px";   // ancho controlado
      img.style.maxHeight = "280px";  // altura controlada
      img.style.display = "block";    // 👈 fuerza que cada imagen esté debajo de la otra
      img.style.margin = "0 auto 15px auto"; // centrada y con margen inferior
      img.style.pageBreakInside = "avoid";   // evita cortes dentro de la imagen
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// Variables globales para guardar selección
let clienteSeleccionado = "Cliente";
let ubicacionSeleccionada = "Ubicacion";

// Preparar valores para exportar a PDF
function prepararParaPDF() {
  document.querySelectorAll("input, select").forEach(el => {
    if (el.type === "file" || el.type === "button") return;
    const span = document.createElement("span");
    if (el.tagName === "SELECT") {
      const texto = el.options[el.selectedIndex]?.text || "";
      span.textContent = texto;

      // Guardar selección en variables globales
      if (el.id === "cliente") clienteSeleccionado = texto || "Cliente";
      if (el.id === "ubicacion") ubicacionSeleccionada = texto || "Ubicacion";
    } else {
      span.textContent = el.value;
    }
    span.style.padding = "4px";
    span.style.display = "inline-block";
    el.parentNode.replaceChild(span, el);
  });

  document.querySelectorAll("textarea").forEach(el => {
    const span = document.createElement("span");
    const texto = el.value.replace(/\n/g, "<br>");
    span.innerHTML = texto;
    span.style.padding = "4px";
    span.style.display = "block";
    span.style.whiteSpace = "pre-wrap";
    if (texto.length > 300) {
      span.style.pageBreakInside = "avoid";
      span.style.pageBreakBefore = "auto";
    }
    el.parentNode.replaceChild(span, el);
  });

  const reparacionDiv = document.getElementById("camposReparacion");
  if (reparacionDiv && reparacionDiv.style.display === "block") {
    reparacionDiv.style.pageBreakBefore = "none";
  }
}

// Generar nombre dinámico para el PDF usando las variables globales
function generarNombrePDF() {
  const fecha = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `Reporte_Tecnico-${clienteSeleccionado}-${ubicacionSeleccionada}-${fecha}.pdf`.replace(/\s+/g, "_");
}

// Descargar PDF del reporte
function downloadPDF() {
  // Asegúrate de tener estas variables globales definidas en tu script:
  // let clienteSeleccionado = "Cliente";
  // let ubicacionSeleccionada = "Ubicacion";

  establecerFechaActual();
  prepararParaPDF(); // aquí se guardan clienteSeleccionado y ubicacionSeleccionada

  // Ocultar elementos que no deben aparecer en el PDF
  document.querySelectorAll('.no-pdf, #imagen').forEach(el => el.style.display = 'none');

  const element = document.getElementById("reporte");
  if (!element) {
    console.error("No se encontró el elemento #reporte");
    return;
  }

  // Verificar que html2pdf esté disponible
  if (typeof html2pdf !== "function") {
    console.error("html2pdf no está cargado");
    // Restaurar elementos ocultos si algo falla
    document.querySelectorAll('.no-pdf, #imagen').forEach(el => el.style.display = '');
    return;
  }

  html2pdf()
    .set({
      margin: [5, 0, 5, 0],
      filename: generarNombrePDF(), // usa las variables guardadas por prepararParaPDF()
      image: { type: 'jpeg', quality: 0.6 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.page-break' }
    })
    .from(element)
    .save()
    .then(() => {
      // Restaurar elementos ocultos
      document.querySelectorAll('.no-pdf, #imagen').forEach(el => el.style.display = '');
    })
    .catch(err => {
      console.error("Error generando el PDF:", err);
      // Restaurar elementos ocultos si algo falla
      document.querySelectorAll('.no-pdf, #imagen').forEach(el => el.style.display = '');
    });
}

// Verificar login contra backend
function verificarLogin() {
  const usuario = document.getElementById("USUARIO_VALIDO").value;
  const contrasena = document.getElementById("CONTRASENA_VALIDA").value;
  const error = document.getElementById("error");

 fetch("http://192.168.5.14:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ USUARIO_VALIDO: usuario, CONTRASENA_VALIDA: contrasena })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        localStorage.setItem("autenticado", "true");
        localStorage.setItem("panelActivo", "seleccion");
        document.getElementById("loginPanel").style.display = "none";
        document.getElementById("seleccionPanel").style.display = "block";
        error.style.color = "green";
        error.textContent = "✅ Autenticado correctamente";
      } else {
        error.style.color = "red";
        error.textContent = "❌ Usuario o contraseña incorrectos";
      }
    })
    .catch(err => {
      console.error("Error en login:", err);
      error.style.color = "red";
      error.textContent = "❌ Error de servidor";
    });
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.removeItem("autenticado");
  localStorage.removeItem("panelActivo");
  location.reload();
}

// Temporizador de inactividad
let temporizadorInactividad;

function iniciarTemporizadorInactividad() {
  temporizadorInactividad = setTimeout(() => {
    alert("🔒 Seguridad: tu sesión ha sido finalizada automáticamente por inactividad.");
    localStorage.removeItem("autenticado");
    localStorage.removeItem("panelActivo");
    location.reload();
  }, 240000); // 4 minutos
}

function reiniciarTemporizador() {
  clearTimeout(temporizadorInactividad);
  if (localStorage.getItem("autenticado") === "true") {
    iniciarTemporizadorInactividad();
  }
}

// Reiniciar temporizador en eventos de actividad
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evento => {
  document.addEventListener(evento, reiniciarTemporizador);
});

// Iniciar temporizador al cargar si está autenticado
window.addEventListener("load", () => {
  if (localStorage.getItem("autenticado") === "true") {
    iniciarTemporizadorInactividad();
  }
});

// Cerrar modal con Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById("consultaModal");
    if (modal && modal.style.display === "block") {
      cerrarModalConsulta();
    }
  }
});

// Auxiliar para obtener el autor (devuelve una promesa)
function obtenerAutor(id) {
  if (!id) return Promise.resolve("Desconocido");

  // Primero probar como contacto
  return fetch(`/api/contacts/${id}`)
    .then(r => r.ok ? r.json() : fetch(`/api/agents/${id}`).then(r2 => r2.ok ? r2.json() : null))
    .then(data => {
      if (!data) return "Autor no encontrado";
      return data.name || data.email || (data.contact?.name) || "Sin nombre";
    })
    .catch(e => {
      console.error("Error obteniendo autor:", e);
      return "Error al obtener autor";
    });
}

function consultarHistorico(ticketId) {
  const convCont = document.getElementById("conversacionesTicket");
  const notasCont = document.getElementById("notasTicket");

  // Conversaciones (respuestas públicas + adjuntos)
  fetch(`/api/tickets/${ticketId}/conversations`)
    .then(r => {
      if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`);
      return r.json();
    })
    .then(convs => {
      let html = "<h3>📩 Respuestas del caso</h3>";
      if (Array.isArray(convs) && convs.length > 0) {
        convs.forEach(c => {
          const texto = c.body_text || c.body || c.description || "Sin contenido";
          const fecha = c.created_at ? new Date(c.created_at).toLocaleString("es-CO") : "Sin fecha";
          const autorPlaceholderId = `autor-${ticketId}-${c.id}`;

          html += `
            <div class="caso-detalle" style="margin-bottom:15px;">
              <div class="caso-item"><label>Autor:</label> <span id="${autorPlaceholderId}">Cargando...</span></div>
              <div class="caso-item"><label>Fecha:</label> ${fecha}</div>
              <div class="caso-item" style="grid-column: 1 / -1;">
                <label>Respuesta:</label>
                <span style="white-space: pre-wrap;">${texto}</span>
              </div>`;

          if (Array.isArray(c.attachments) && c.attachments.length > 0) {
            html += `<div class="caso-item" style="grid-column: 1 / -1;">
                       <label>Archivos adjuntos:</label>
                       <ul>`;
            c.attachments.forEach(a => {
              const enlace = a.attachment_url || a.url;
              if (enlace) {
                const safeUrl = encodeURI(enlace);
                html += `<li><a href="${safeUrl}" target="_blank" rel="noopener">📎 ${a.name || "Archivo"}</a></li>`;
              }
            });
            html += `</ul></div>`;
          }

          html += `</div>`;
        });
      } else {
        html += `<p style="color:#666;font-style:italic;">No hay conversaciones.</p>`;
      }
      convCont.innerHTML = html;

      // Resolver autores después de pintar el HTML
      if (Array.isArray(convs)) {
        convs.forEach(c => {
          const autorEl = document.getElementById(`autor-${ticketId}-${c.id}`);
          if (!autorEl) return;
          const posibleId = c.user_id || c.actor_id || c.requester_id || null;
          obtenerAutor(posibleId).then(nombre => {
            autorEl.innerText = nombre;
          });
        });
      }
    })
    .catch(error => console.error("Error al traer conversaciones:", error));

  // Notas internas
fetch(`/api/tickets/${ticketId}/notes`)
  .then(r => {
    if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`);
    return r.json();
  })
  .then(notas => {
    console.log("Notas recibidas:", notas); // 👈 Depuración
    let html = "<h3>📝 Notas internas</h3>";
    if (Array.isArray(notas) && notas.length > 0) {
      notas.forEach(n => {
        const texto = n.body || n.description || "Sin contenido";
        const fecha = n.created_at ? new Date(n.created_at).toLocaleString("es-CO") : "Sin fecha";
        const autorPlaceholderId = `nota-autor-${n.id}`;

        html += `
          <div class="caso-detalle" style="margin-bottom:15px;">
            <div class="caso-item"><label>Autor:</label> <span id="${autorPlaceholderId}">Cargando...</span></div>
            <div class="caso-item"><label>Fecha:</label> ${fecha}</div>
            <div class="caso-item" style="grid-column: 1 / -1;">
              <label>Nota:</label>
              <span style="white-space: pre-wrap;">${texto}</span>
            </div>
          </div>`;

        // Resolver autor de la nota igual que en conversaciones
        const posibleId = n.user_id || n.actor_id || n.requester_id || null;
        obtenerAutor(posibleId).then(nombre => {
          const el = document.getElementById(autorPlaceholderId);
          if (el) el.innerText = nombre;
        });
      });
    } else {
      html += `<p style="color:#666;font-style:italic;">No hay notas internas.</p>`;
    }
    notasCont.innerHTML = html; // 👈 ahora se insertan en el div correcto
  })
  .catch(error => console.error("Error al traer notas:", error));
}
function mostrarEncuesta() {
  document.getElementById("encuestaModal").style.display = "block";
}

function cerrarEncuesta() {
  document.getElementById("encuestaModal").style.display = "none";
}

function enviarEncuesta() {
  const ticketId = document.getElementById("ticketEncuesta").value.trim();
  const rating = document.getElementById("calificacion").value.trim();
  const feedback = document.getElementById("feedback").value.trim();

  if (!ticketId) {
    alert("⚠️ Ingresa un ID de ticket válido");
    return;
  }

  // 🚀 Enviamos la encuesta al backend → Freshdesk
  fetch(`/api/tickets/${ticketId}/satisfaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      feedback: feedback,
      ratings: { default_question: Number(rating) }
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(`❌ ${data.error}`);
        return;
      }

      cerrarEncuesta();
      alert("✅ Encuesta enviada a Freshdesk correctamente");

      // Mapa de calificaciones
      const satisfactionMap = {
        "103": "😃 Extremadamente Feliz",
        "102": "😊 Muy Feliz",
        "101": "🙂 Feliz",
        "100": "😐 Neutral",
        "-101": "🙁 Infeliz",
        "-102": "☹️ Muy Infeliz",
        "-103": "😡 Extremadamente Infeliz"
      };

      const calificacionTexto = satisfactionMap[rating] || rating;

      // 🚀 Reemplazamos el botón por la respuesta
      const contenedor = document.getElementById("calificacionContainer");
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="respuesta-encuesta">
            <p><strong>Ticket:</strong> ${ticketId}</p>
            <p><strong>Calificación:</strong> ${calificacionTexto}</p>
            <p><strong>Comentarios:</strong> ${feedback || "Sin comentarios"}</p>
          </div>
        `;
      }
    })
    .catch(err => {
      alert("❌ Error al enviar la encuesta");
      console.error(err);
    });
}