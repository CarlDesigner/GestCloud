// Script para manejar el historial de cambios de apartamentos
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

/**
 * Guarda un registro de historial cuando se crea un nuevo apartamento
 * @param {string} apartamentoId - ID del apartamento
 * @param {Object} datosApartamento - Datos del apartamento creado
 * @param {string} parqueaderoAsignado - ID del parqueadero asignado (opcional)
 */
export async function registrarCreacionApartamento(apartamentoId, datosApartamento, parqueaderoAsignado = null) {
  try {
    const historialData = {
      apartamentoId,
      tipoAccion: 'creacion',
      fechaHora: Date.now(), // Cambio temporal para debug
      usuario: 'Usuario', // Por ahora, luego será el usuario autenticado
      cambios: {
        datosCreados: {
          numero: datosApartamento.numero,
          estado: datosApartamento.estado,
          nombre: datosApartamento.nombre,
          contacto: datosApartamento.contacto,
          rol: datosApartamento.rol,
          observaciones: datosApartamento.observaciones || '',
          parqueadero: parqueaderoAsignado || 'No asignado'
        }
      }
    };

    await addDoc(collection(db, 'historial_apartamentos'), historialData);
    // Registro exitoso silencioso
  } catch (error) {
    // Error silencioso al registrar historial de creación
  }
}

/**
 * Guarda un registro de historial cuando se edita un apartamento
 * @param {string} apartamentoId - ID del apartamento
 * @param {Object} datosAnteriores - Datos anteriores del apartamento
 * @param {Object} datosNuevos - Datos nuevos del apartamento
 */
export async function registrarEdicionApartamento(apartamentoId, datosAnteriores, datosNuevos) {
  try {
    const camposModificados = [];
    // Solo permitir registrar cambios en 'numero' si realmente se puede editar (por seguridad, pero en UI nunca se edita)
    const campos = ['estado', 'nombre', 'contacto', 'rol', 'observaciones'];
    // Si algún día se habilita edición de número, agregar lógica aquí
    campos.forEach(campo => {
      const valorAnterior = datosAnteriores[campo] || '';
      const valorNuevo = datosNuevos[campo] || '';
      if (valorAnterior !== valorNuevo) {
        camposModificados.push({
          campo,
          valorAnterior,
          valorNuevo
        });
      }
    });

    // Solo registrar si hubo cambios
    if (camposModificados.length > 0) {
      const historialData = {
        apartamentoId,
        tipoAccion: 'edicion',
        fechaHora: Date.now(), // Cambio temporal para debug
        usuario: 'Usuario', // Por ahora, luego será el usuario autenticado
        cambios: {
          camposModificados
        }
      };

      await addDoc(collection(db, 'historial_apartamentos'), historialData);
      // Registro exitoso silencioso
    }
  } catch (error) {
    // Error silencioso al registrar historial de edición
  }
}

/**
 * Obtiene el historial de cambios de un apartamento
 * @param {string} apartamentoId - ID del apartamento
 * @returns {Array} Array con el historial ordenado por fecha (más reciente primero)
 */
export async function obtenerHistorialApartamento(apartamentoId) {
  try {
    // Consulta simplificada sin orderBy para evitar el error de índice temporalmente
    const q = query(
      collection(db, 'historial_apartamentos'),
      where('apartamentoId', '==', apartamentoId)
    );
    
    const snapshot = await getDocs(q);
    const historial = [];
    
    snapshot.forEach(documento => {
      historial.push({
        id: documento.id,
        ...documento.data()
      });
    });
    
    // Ordenar manualmente en JavaScript (más reciente primero)
    return historial.sort((a, b) => b.fechaHora - a.fechaHora);
  } catch (error) {
    // Error silencioso al obtener historial
    return [];
  }
}

/**
 * Elimina todo el historial de cambios de un apartamento
 * @param {string} apartamentoId - ID del apartamento
 */
export async function eliminarHistorialApartamento(apartamentoId) {
  try {
    // Obtener todos los registros de historial para este apartamento
    const q = query(
      collection(db, 'historial_apartamentos'),
      where('apartamentoId', '==', apartamentoId)
    );
    
    const snapshot = await getDocs(q);
    
    // Eliminar cada registro de historial
    const promesasEliminar = [];
    snapshot.forEach(documento => {
      promesasEliminar.push(deleteDoc(doc(db, 'historial_apartamentos', documento.id)));
    });
    
    // Esperar a que se eliminen todos los registros
    await Promise.all(promesasEliminar);
    
    // Eliminación exitosa silenciosa
  } catch (error) {
    // Error silencioso al eliminar historial
  }
}

/**
 * Formatea la fecha y hora para mostrar en el timeline
 * @param {any} timestamp - Timestamp de Firebase (puede ser Timestamp o Date)
 * @returns {string} Fecha formateada
 */
export function formatearFechaHora(timestamp) {
  let fecha;
  
  // Si es un Timestamp de Firebase
  if (timestamp && typeof timestamp.toDate === 'function') {
    fecha = timestamp.toDate();
  } 
  // Si es un objeto Date
  else if (timestamp instanceof Date) {
    fecha = timestamp;
  }
  // Si es un número (timestamp en milisegundos)
  else if (typeof timestamp === 'number') {
    fecha = new Date(timestamp);
  }
  // Si tiene el campo seconds (formato de Firestore)
  else if (timestamp && timestamp.seconds) {
    fecha = new Date(timestamp.seconds * 1000);
  }
  // Fallback
  else {
    fecha = new Date();
  }
  
  const opciones = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return fecha.toLocaleDateString('es-ES', opciones);
}

/**
 * Obtiene el nombre legible de un campo
 * @param {string} campo - Nombre del campo
 * @returns {string} Nombre legible del campo
 */
export function obtenerNombreCampo(campo) {
  const nombresLegibles = {
    numero: 'N° Apartamento',
    estado: 'Estado',
    nombre: 'Residente principal',
    contacto: 'Contacto',
    rol: 'Rol',
    observaciones: 'Observaciones'
  };
  
  return nombresLegibles[campo] || campo;
}

/**
 * Genera el HTML para un elemento del timeline
 * @param {Object} item - Item del historial
 * @param {boolean} esUltimo - Si es el último elemento del timeline
 * @returns {string} HTML del elemento del timeline
 */
export function generarElementoTimeline(item, esUltimo = false) {
  const fechaFormateada = formatearFechaHora(item.fechaHora);
  const claseElemento = esUltimo ? 'ms-4' : 'mb-10 ms-4';
  
  if (item.tipoAccion === 'creacion') {
    const datos = item.cambios.datosCreados;
    return `
      <li class="${claseElemento}">
        <div class="absolute w-3 h-3 bg-yellow-300 rounded-full mt-1.5 -start-1.5 shadow-md"></div>
        <div class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
                <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Apartamento registrado</h3>
            </div>
            <time class="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">${fechaFormateada}</time>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">N° Apartamento</span>
              <span class="px-2.5 py-1 text-xs font-bold bg-yellow-600 text-white rounded-full shadow-sm">
                ${datos.numero}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Estado</span>
              <span class="px-2.5 py-1 text-xs font-bold bg-yellow-600 text-white rounded-full shadow-sm">
                ${datos.estado}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Residente</span>
              <span class="px-2.5 py-1 text-xs font-bold bg-yellow-600 text-white rounded-full shadow-sm">
                ${datos.nombre.toUpperCase()}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Rol</span>
              <span class="px-2.5 py-1 text-xs font-bold bg-yellow-600 text-white rounded-full shadow-sm">
                ${datos.rol}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <span class="text-sm font-medium text-yellow-700 dark:text-yellow-300">Parqueadero</span>
              <span class="px-2.5 py-1 text-xs font-bold ${datos.parqueadero && datos.parqueadero !== 'No asignado' ? 'bg-yellow-600' : 'bg-gray-600'} text-white rounded-full shadow-sm">
                ${datos.parqueadero || 'No asignado'}
              </span>
            </div>
          </div>
          
          <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-300">Creado por: <span class="font-medium">${item.usuario}</span></span>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              Completado
            </span>
          </div>
        </div>
      </li>
    `;
  } 
  
  if (item.tipoAccion === 'edicion') {
    // Crear badges de cambios con diseño mejorado
    const cambiosBadges = item.cambios.camposModificados.map(cambio => {
      const nombreCampo = obtenerNombreCampo(cambio.campo);
      const valorAnterior = cambio.valorAnterior || 'Sin información';
      const valorNuevo = cambio.valorNuevo || 'Sin información';
      
      return `
        <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${nombreCampo}</span>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span class="text-xs text-gray-500 dark:text-gray-400">Modificado</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Anterior</span>
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/30">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                </svg>
                ${valorAnterior}
              </span>
            </div>
            <div class="flex-shrink-0 p-1">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </div>
            <div class="flex-1">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Nuevo</span>
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/30">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                ${valorNuevo}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <li class="${claseElemento}">
        <div class="absolute w-3 h-3 bg-blue-600 rounded-full mt-1.5 -start-1.5  shadow-md"></div>
        <div class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Información actualizada</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${item.cambios.camposModificados.length} campo${item.cambios.camposModificados.length > 1 ? 's modificados' : ' modificado'}</p>
              </div>
            </div>
            <time class="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">${fechaFormateada}</time>
          </div>
          
          <div class="space-y-3 mb-4">
            ${cambiosBadges}
          </div>
          
          <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-300">Editado por: <span class="font-medium">${item.usuario}</span></span>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Actualizado
            </span>
          </div>
        </div>
      </li>
    `;
  }
  
  return '';
}

/**
 * Muestra el modal de historial para un apartamento específico
 * @param {string} apartamentoId - ID del apartamento
 * @param {string} numeroApartamento - Número del apartamento para mostrar en el título
 */
export async function mostrarHistorialApartamento(apartamentoId, numeroApartamento) {
  const modal = document.getElementById('modal-historial-apartamento');
  const infoApartamento = document.getElementById('historial-apartamento-info');
  const sinHistorial = document.getElementById('sin-historial');
  const timelineHistorial = document.getElementById('timeline-historial');
  const listaHistorial = document.getElementById('lista-historial');
  const loadingHistorial = document.getElementById('loading-historial');
  
  if (!modal) return;
  
  // Mostrar modal y loading
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  infoApartamento.innerHTML = `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mr-2">
      Apartamento ${numeroApartamento}
    </span>
    <span class="text-gray-500 dark:text-gray-400">
      Registro completo de cambios y modificaciones
    </span>
  `;
  loadingHistorial.classList.remove('hidden');
  sinHistorial.classList.add('hidden');
  timelineHistorial.classList.add('hidden');
  
  try {
    // Obtener historial
    const historial = await obtenerHistorialApartamento(apartamentoId);
    
    // Ocultar loading
    loadingHistorial.classList.add('hidden');
    
    if (historial.length === 0) {
      // No hay historial
      sinHistorial.classList.remove('hidden');
    } else {
      // Mostrar timeline
      timelineHistorial.classList.remove('hidden');
      
      // Generar HTML del timeline
      const timelineHtml = historial.map((item, index) => 
        generarElementoTimeline(item, index === historial.length - 1)
      ).join('');
      
      listaHistorial.innerHTML = timelineHtml;
    }
  } catch (error) {
    // Error silencioso al cargar historial
    loadingHistorial.classList.add('hidden');
    sinHistorial.classList.remove('hidden');
    
    // Mostrar mensaje de error más específico
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center py-16';
    errorDiv.innerHTML = `
      <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Error al cargar el historial
      </h3>
      <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
        No se pudo obtener el historial de cambios. Intenta nuevamente.
      </p>
      <button 
        onclick="mostrarHistorialApartamento('${apartamentoId}', '${numeroApartamento}')"
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Reintentar
      </button>
    `;
    
    const contenidoModal = sinHistorial.parentElement;
    contenidoModal.appendChild(errorDiv);
    sinHistorial.classList.add('hidden');
  }
}

/**
 * Inicializa los event listeners para el modal de historial
 */
export function inicializarHistorialUI() {
  const modal = document.getElementById('modal-historial-apartamento');
  const cerrarBtn = document.getElementById('cerrar-modal-historial');
  const cerrarBtn2 = document.getElementById('cerrar-modal-historial-btn');
  
  if (!modal) return;
  
  // Función para cerrar modal
  const cerrarModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };
  
  // Event listeners para cerrar
  if (cerrarBtn) cerrarBtn.addEventListener('click', cerrarModal);
  if (cerrarBtn2) cerrarBtn2.addEventListener('click', cerrarModal);
  
  // Cerrar con Esc
  const cerrarConEsc = (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      cerrarModal();
    }
  };
  
  document.addEventListener('keydown', cerrarConEsc);
  
  // Cerrar al hacer click fuera del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  });
}

// Hacer las funciones accesibles globalmente
window.mostrarHistorialApartamento = mostrarHistorialApartamento;

// Verificar que el script se carga correctamente
if (typeof window !== 'undefined') {
  // Script cargado correctamente
}
