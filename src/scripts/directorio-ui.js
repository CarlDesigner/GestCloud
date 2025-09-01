// Mostrar/ocultar botón limpiar búsqueda y limpiar input
import Fuse from 'fuse.js';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

import { 
  registrarCreacionApartamento, 
  registrarEdicionApartamento,
  inicializarHistorialUI,
  eliminarHistorialApartamento 
} from './historial-apartamento';

let currentPage = 1;
let datosFiltrados = []; // Variable para almacenar datos filtrados actuales

// Mostrar/ocultar botón limpiar búsqueda y limpiar input
document.addEventListener('DOMContentLoaded', () => {
  const inputBusqueda = document.getElementById('table-search');
  const btnLimpiar = document.getElementById('btn-limpiar-busqueda');
  if (inputBusqueda && btnLimpiar) {
    inputBusqueda.addEventListener('input', () => {
      btnLimpiar.style.display = inputBusqueda.value.length > 0 ? '' : 'none';
    });
    btnLimpiar.addEventListener('click', () => {
      inputBusqueda.value = '';
      btnLimpiar.style.display = 'none';
  // Regresar a la página 1 al limpiar búsqueda
      inputBusqueda.dispatchEvent(new Event('input'));
    });
  }
});

let datosGlobal = [];

// --- Funciones principales: deben ir antes de cualquier uso ---

// Función para cargar parqueaderos disponibles
async function cargarParqueaderosDisponibles() {
  try {
    const q = query(collection(db, 'parqueaderos_residentes'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(p => !p.apartamento || p.apartamento === null || p.apartamento === undefined || String(p.apartamento).trim() === '' || String(p.apartamento) === 'null')
      .sort((a, b) => {
        const getNum = (id) => {
          const match = (id || '').match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getNum(a.id) - getNum(b.id);
      });
  } catch (error) {
    return [];
  }
}

// Función para poblar el select de parqueaderos para edición (incluye el asignado actual)
async function poblarSelectParqueaderosParaEdicion(parqueaderoAsignadoActual = null) {
  const select = document.getElementById('select-parqueadero');
  if (!select) return;
  
  try {
    const q = query(collection(db, 'parqueaderos_residentes'));
    const snapshot = await getDocs(q);
    const parqueaderos = snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(p => 
        // Incluir parqueaderos sin asignar O el que está asignado actualmente
        (!p.apartamento || p.apartamento === null) || (parqueaderoAsignadoActual && p.id === parqueaderoAsignadoActual)
      )
      .sort((a, b) => {
        const getNum = (id) => {
          const match = (id || '').match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getNum(a.id) - getNum(b.id);
      });
    
    // Limpiar opciones existentes excepto la primera
    select.innerHTML = '<option value="">Seleccionar parqueadero</option>';
    
    parqueaderos.forEach(parqueadero => {
      const option = document.createElement('option');
      option.value = parqueadero.id;
      
      // Mostrar si está asignado o disponible
      const estado = parqueadero.apartamento ? 'Asignado' : 'Disponible';
      option.textContent = `${parqueadero.id || 'N/A'} - ${estado}`;
      
      if (parqueaderoAsignadoActual === parqueadero.id) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
    
    // Si no hay parqueaderos disponibles y no hay uno asignado, mostrar mensaje
    if (parqueaderos.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay parqueaderos disponibles';
      option.disabled = true;
      select.appendChild(option);
    }
  } catch (error) {
    // Error handling
  }
}

// Función para poblar el select de parqueaderos
async function poblarSelectParqueaderos(parqueaderoSeleccionado = null) {
  const select = document.getElementById('select-parqueadero');
  if (!select) return;
  
  const parqueaderos = await cargarParqueaderosDisponibles();
  
  // DEBUG: Mostrar qué parqueaderos existen realmente en consola
  window.debugParqueaderosDisponibles = parqueaderos.map(p => p.id);
  
  // Limpiar opciones existentes excepto la primera
  select.innerHTML = '<option value="">Seleccionar parqueadero</option>';
  
  parqueaderos.forEach(parqueadero => {
    const option = document.createElement('option');
    option.value = parqueadero.id;
    option.textContent = `${parqueadero.id || 'N/A'} - Disponible`;
    if (parqueaderoSeleccionado === parqueadero.id) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  // Si no hay parqueaderos disponibles, mostrar mensaje
  if (parqueaderos.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No hay parqueaderos disponibles';
    option.disabled = true;
    select.appendChild(option);
  } else {
    // Agregar información sobre cuántos parqueaderos están disponibles
    const infoOption = document.createElement('option');
    infoOption.value = '';
    infoOption.textContent = `--- ${parqueaderos.length} parqueaderos disponibles ---`;
    infoOption.disabled = true;
    select.appendChild(infoOption);
  }
}









function actualizarContadoresDirectorio(datos) {
  // Actualizar los contadores del dropdown de filtro
  const total = datos.length;
  const ocupados = datos.filter(a => a.estado === 'Ocupado').length;
  const desocupados = datos.filter(a => a.estado === 'Desocupado').length;
  const arriendo = datos.filter(a => a.estado === 'En arriendo').length;
  const venta = datos.filter(a => a.estado === 'En venta').length;
  const el = id => document.getElementById(id);
  if (el('contador-directorio-todos')) el('contador-directorio-todos').textContent = `(${total})`;
  if (el('contador-directorio-ocupado')) el('contador-directorio-ocupado').textContent = `(${ocupados})`;
  if (el('contador-directorio-desocupado')) el('contador-directorio-desocupado').textContent = `(${desocupados})`;
  if (el('contador-directorio-arriendo')) el('contador-directorio-arriendo').textContent = `(${arriendo})`;
  if (el('contador-directorio-venta')) el('contador-directorio-venta').textContent = `(${venta})`;
}

function cerrarModalPrincipalConEsc(e) {
  const modal = document.getElementById('modal-apartamento');
  if (e.key === 'Escape' && modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.removeEventListener('keydown', cerrarModalPrincipalConEsc);
  }
}

// --- Fin funciones principales ---
// Función para ver detalles de un apartamento
window.verApartamento = async function verApartamento(apartamentoId) {
  const apto = datosGlobal.find(a => a.id === apartamentoId);
  if (!apto) return;
  
  // Buscar parqueadero asignado
  let parqueaderoAsignado = 'Sin asignar';
  try {
    const qParqueaderos = query(collection(db, 'parqueaderos_residentes'));
    const snapshotParqueaderos = await getDocs(qParqueaderos);
    const parqueaderoDoc = snapshotParqueaderos.docs.find(documento => {
      const parqueadero = documento.data();
      return parqueadero.apartamento === String(apto.numero);
    });
    
    if (parqueaderoDoc) {
      parqueaderoAsignado = parqueaderoDoc.data().id || 'Sin asignar';
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error obteniendo parqueadero:', error);
  }
  
  let modalDetalles = document.getElementById('modal-detalles-apto');
  // Declarar cerrarConEsc como función de flecha para que acceda a modalDetalles
  const cerrarConEsc = (e) => {
    if (e.key === 'Escape') {
      if (modalDetalles) modalDetalles.remove();
      document.removeEventListener('keydown', cerrarConEsc);
    }
  };
  if (!modalDetalles) {
    modalDetalles = document.createElement('div');
    modalDetalles.id = 'modal-detalles-apto';
    modalDetalles.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
    modalDetalles.innerHTML = `
      <div class="relative w-full max-w-2xl max-h-full mx-auto my-auto">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <div class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Detalles del Apartamento</h3>
            <button type="button" id="cerrar-modal-detalles-apto" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x w-3 h-3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              <span class="sr-only">Cerrar modal</span>
            </button>
          </div>
          <div class="p-6 space-y-6">
            <div class="relative overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-50 border border-blue-100 rounded-lg shadow p-5 mb-4 dark:from-blue-900/30 dark:via-blue-900/20 dark:to-cyan-900/20 dark:border-blue-800">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">N° Apartamento</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.numero}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Estado</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.estado}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Residente principal</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.nombre}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Contacto</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.contacto}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Rol</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.rol}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Observaciones</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${apto.observaciones || '-'}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-700/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-600/40">
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Parqueadero</span>
                  <p class="text-slate-800 dark:text-slate-100 font-semibold text-lg">${parqueaderoAsignado}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDetalles);
    document.getElementById('cerrar-modal-detalles-apto').onclick = () => {
      modalDetalles.remove();
      document.removeEventListener('keydown', cerrarConEsc);
    };
    // Cerrar con Esc (declaración única al inicio del bloque)
    setTimeout(() => {
      document.addEventListener('keydown', cerrarConEsc);
    }, 100);
  }
};

// Función para editar apartamento
window.editarApartamento = async function editarApartamento(apartamentoId) {
  const apto = datosGlobal.find(a => a.id === apartamentoId);
  if (!apto) return;
  const modal = document.getElementById('modal-apartamento');
  const form = document.getElementById('form-apartamento');
  if (!modal || !form) return;
  
  // Buscar el parqueadero asignado a este apartamento
  let parqueaderoAsignado = null;
  try {
    const qParqueaderos = query(collection(db, 'parqueaderos_residentes'));
    const snapshotParqueaderos = await getDocs(qParqueaderos);
    const parqueaderoDoc = snapshotParqueaderos.docs.find(documento => {
      const parqueadero = documento.data();
      return parqueadero.apartamento === apto.numero;
    });
    if (parqueaderoDoc) {
      parqueaderoAsignado = parqueaderoDoc.id;
    }
  } catch (error) {
    // Error handling
  }
  
  // Cargar parqueaderos disponibles (incluyendo el asignado actual)
  await poblarSelectParqueaderosParaEdicion(parqueaderoAsignado);
  
  // Rellenar el formulario con los datos
  form.elements.numero.value = apto.numero || '';
  form.elements.numero.disabled = true; // Deshabilitar campo número al editar
  form.elements.estado.value = apto.estado || '';
  form.elements.nombre.value = apto.nombre || '';
  form.elements.contacto.value = apto.contacto || '';
  form.elements.rol.value = apto.rol || '';
  form.elements.observaciones.value = apto.observaciones || '';
  
  // Seleccionar el parqueadero asignado
  if (parqueaderoAsignado && form.elements.parqueadero) {
    form.elements.parqueadero.value = parqueaderoAsignado;
  }
  
  // Guardar el id editando
  form.setAttribute('data-edit-id', apartamentoId);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

// Eliminado: submit duplicado. Toda la lógica de submit está centralizada en el bloque DOMContentLoaded más abajo.

// Función para actualizar apartamento en Firestore
// Función para manejar cambios en la asignación de parqueaderos
async function manejarCambioParqueadero(numeroApartamentoAnterior, numeroApartamentoNuevo, nuevoParqueaderoId, propietario) {
  try {
    // Buscar y liberar el parqueadero anterior si existe
    const qParqueaderos = query(collection(db, 'parqueaderos_residentes'));
    const snapshotParqueaderos = await getDocs(qParqueaderos);
    
    // Liberar parqueadero anterior
    const parqueaderoAnterior = snapshotParqueaderos.docs.find(documento => {
      const parqueadero = documento.data();
      return parqueadero.apartamento === numeroApartamentoAnterior;
    });
    
    if (parqueaderoAnterior) {
      await updateDoc(doc(db, 'parqueaderos_residentes', parqueaderoAnterior.id), {
        apartamento: null,
        propietario: null,
        vehiculo: null,
        estado: 'libre'
      });
    }
    
    // Asignar nuevo parqueadero si se seleccionó uno - USANDO LA MISMA LÓGICA QUE VISITANTES
    if (nuevoParqueaderoId) {
      const parqueaderosQuery = query(
        collection(db, 'parqueaderos_residentes'), 
        where('id', '==', nuevoParqueaderoId)
      );
      const parqueaderosSnapshot = await getDocs(parqueaderosQuery);
      
      if (!parqueaderosSnapshot.empty) {
        const parqueaderoDoc = parqueaderosSnapshot.docs[0];
        if (parqueaderoDoc) {
          await updateDoc(doc(db, 'parqueaderos_residentes', parqueaderoDoc.id), {
            apartamento: numeroApartamentoNuevo,
            propietario: propietario || null,
            estado: 'libre'
          });
        }
      }
    }
  } catch (error) {
    // Error handling
  }
}

async function actualizarApartamento(id, data) {
  // Verificar si el nuevo número ya existe en otro registro
  const q = query(collection(db, 'directorio'));
  const snapshot = await getDocs(q);
  const existe = snapshot.docs.some(d => d.id !== id && d.data().numero === data.numero);
  if (existe) {
    window.mostrarAlert('Ya existe otro apartamento con ese número.', 'error');
    return;
  }
  
  // Obtener los datos anteriores del apartamento para el historial
  const apartamentoAnterior = datosGlobal.find(apto => apto.id === id);
  
  // Obtener el número del apartamento para usar en la alerta
  const numeroApartamento = data.numero || apartamentoAnterior?.numero || 'sin número';

  // Manejar cambios en el parqueadero asignado
  if (apartamentoAnterior) {
    await manejarCambioParqueadero(apartamentoAnterior.numero, data.numero, data.parqueadero, data.nombre);
  }

  // Agregar campo de fechaActualizacion
  const dataActualizada = { ...data, fechaActualizacion: Date.now() };

  // Actualizar en Firestore
  await updateDoc(doc(db, 'directorio', id), dataActualizada);

  // Registrar en el historial si hay datos anteriores
  if (apartamentoAnterior) {
    await registrarEdicionApartamento(id, apartamentoAnterior, data);
  }
  
  // Usar el número del apartamento que ya definimos arriba
  window.mostrarAlert(`Apartamento ${numeroApartamento} actualizado correctamente`, 'success');
}






let totalPages = 1;
let fuse = null;
const fuseOptions = {
  keys: [
    { name: 'nombre', weight: 0.5 },
    { name: 'numero', weight: 0.5 }
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 3,
  ignoreLocation: true,
  findAllMatches: true,
  useExtendedSearch: true,
  getFn: (obj, path) => {
    // Normaliza los valores para ignorar tildes/acentos
    const value = Fuse.config.getFn(obj, path);
          if (typeof value === 'string') {
            return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return value;
  }
};



// --- Declaraciones auxiliares para menús contextuales ---
// Se definen fuera para evitar no-use-before-define y sin guion bajo inicial
function cerrarMenu(menu) {
  if (menu && menu.parentNode) menu.remove();
  document.removeEventListener('click', menu.cerrarMenuHandler);
  document.removeEventListener('keydown', menu.manejarTeclaEscapeHandler);
}

function manejarTeclaEscapeFactory(menu) {
  return function manejarTeclaEscape(keyEvent) {
    if (keyEvent.key === 'Escape') {
      cerrarMenu(menu);
    }
  };
}

// Menú de acciones contextual para cada apartamento
window.mostrarMenuAccionesDirectorio = function mostrarMenuAccionesDirectorio(event, apartamentoId) {
  event.stopPropagation();
  // Verificar si ya existe un menú abierto para este apartamento
  const menuExistente = document.querySelector(`.menu-acciones[data-apartamento-id="${apartamentoId}"]`);
  if (menuExistente) {
    menuExistente.remove();
    return;
  }
  // Remover cualquier otro menú abierto
  document.querySelectorAll('.menu-acciones').forEach(m => m.remove());
  // Crear menú contextual
  const menu = document.createElement('div');
  menu.className = 'absolute z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 dark:divide-gray-600';
  menu.setAttribute('data-apartamento-id', apartamentoId);
  menu.innerHTML = `
    <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
      <li>
        <button onclick="verApartamento('${apartamentoId}')" class="block w-full text-left py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">👁️ Ver detalles</button>
      </li>
      <li>
        <button onclick="editarApartamento('${apartamentoId}')" class="block w-full text-left py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">✏️ Editar</button>
      </li>
      <li>
        <button onclick="eliminarApartamento('${apartamentoId}')" class="block w-full text-left py-2 px-4 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-red-500">🗑️ Eliminar</button>
      </li>
    </ul>
  `;
  menu.classList.add('menu-acciones');
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const menuRect = menu.getBoundingClientRect();
  const buttonRect = event.target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let top = buttonRect.bottom + 5;
  const { left: initialLeft } = buttonRect;
  let left = initialLeft;
  if (left + menuRect.width > viewportWidth) {
    left = buttonRect.right - menuRect.width;
  }
  if (left < 0) {
    left = 10;
  }
  if (top + menuRect.height > viewportHeight) {
    top = buttonRect.top - menuRect.height - 5;
  }
  if (top < 0) {
    top = 10;
  }
  menu.style.position = 'fixed';
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.visibility = 'visible';
  // Handlers únicos por menú (sin guion bajo)
  menu.cerrarMenuHandler = () => cerrarMenu(menu);
  menu.manejarTeclaEscapeHandler = manejarTeclaEscapeFactory(menu);
  setTimeout(() => {
    document.addEventListener('click', menu.cerrarMenuHandler);
    document.addEventListener('keydown', menu.manejarTeclaEscapeHandler);
  }, 100);
};


async function cargarDirectorio() {
  // Obtener todos los registros sin ordenar en la consulta
  const q = query(collection(db, 'directorio'));
  const snapshot = await getDocs(q);
  // Mapear y asignar fechas por defecto si no existen
  const datos = snapshot.docs.map(documento => {
    const data = documento.data();
    return {
      id: documento.id,
      ...data,
      fechaCreacion: data.fechaCreacion || 0,
      fechaActualizacion: data.fechaActualizacion || data.fechaCreacion || 0
    };
  });
  // Ordenar: primero por fechaActualizacion descendente, luego por fechaCreacion, luego por número
  return datos.sort((a, b) => {
    if (b.fechaActualizacion !== a.fechaActualizacion) {
      return b.fechaActualizacion - a.fechaActualizacion;
    }
    if (b.fechaCreacion !== a.fechaCreacion) {
      return b.fechaCreacion - a.fechaCreacion;
    }
    return (a.numero || '').localeCompare(b.numero || '', undefined, { numeric: true });
  });
}


// Función para asignar un parqueadero específico seleccionado
async function guardarApartamento(data) {
  // VERIFICAR que tenemos el número de apartamento
  if (!data.numero) {
    window.mostrarAlert('Error: Falta el número de apartamento', 'error');
    return;
  }
  
  // Verificar si ya existe un apartamento con el mismo número
  const q = query(collection(db, 'directorio'));
  const snapshot = await getDocs(q);
  const existe = snapshot.docs.some(documento => documento.data().numero === data.numero);
  if (existe) {
    window.mostrarAlert('Ya existe un apartamento con ese número', 'error');
    return;
  }
  
  // Agregar campo de fecha de creación
  const docRef = await addDoc(collection(db, 'directorio'), { ...data, fechaCreacion: Date.now() });
  
  let parqueaderoAsignado = null;
  
  // ASIGNACIÓN DE PARQUEADERO - USANDO LA MISMA LÓGICA QUE VISITANTES
  if (data.parqueadero && data.parqueadero.trim() !== '') {
    try {
      // Buscar el documento del parqueadero usando query + where (como en visitantes)
      const parqueaderosQuery = query(
        collection(db, 'parqueaderos_residentes'), 
        where('id', '==', data.parqueadero)
      );
      const parqueaderosSnapshot = await getDocs(parqueaderosQuery);
      
      if (!parqueaderosSnapshot.empty) {
        const parqueaderoDoc = parqueaderosSnapshot.docs[0];
        if (parqueaderoDoc) {
          await updateDoc(doc(db, 'parqueaderos_residentes', parqueaderoDoc.id), {
            apartamento: String(data.numero),
            propietario: String(data.nombre),
            estado: 'libre'
          });
          
          parqueaderoAsignado = data.parqueadero;
          window.mostrarAlert(`Apartamento ${data.numero} creado y parqueadero ${data.parqueadero} asignado correctamente`, 'success');
        }
      } else {
        window.mostrarAlert(`Apartamento ${data.numero} creado, pero no se encontró el parqueadero ${data.parqueadero}`, 'warning');
      }
      
    } catch (error) {
      window.mostrarAlert(`Apartamento ${data.numero} creado, pero error asignando parqueadero: ${error.message}`, 'warning');
    }
  } else {
    window.mostrarAlert(`Apartamento ${data.numero} creado exitosamente`, 'success');
  }
  
  // Registrar en el historial (después de la asignación del parqueadero)
  await registrarCreacionApartamento(docRef.id, data, parqueaderoAsignado);
}



function limpiarFormulario(form) {
  form.reset();
}

// --- Mover funciones para cumplir no-use-before-define globalmente ---




// --- Mover funciones para cumplir no-use-before-define ---




async function renderTabla(datos) {
  const tbody = document.getElementById('tabla-directorio-body');
  tbody.innerHTML = '';
  
  // Obtener todos los parqueaderos asignados de una vez
  const parqueaderosData = {};
  try {
    const parqueaderosSnapshot = await getDocs(collection(db, 'parqueaderos_residentes'));
    parqueaderosSnapshot.forEach(docParqueadero => {
      const data = docParqueadero.data();
      if (data.apartamento) {
        parqueaderosData[data.apartamento] = data.id;
      }
    });
  } catch (error) {
    // Error silencioso obteniendo parqueaderos
  }
  
  // Paginación
  const registrosPorPagina = 20;
  totalPages = Math.ceil(datos.length / registrosPorPagina) || 1;
  const inicio = (currentPage - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datos.slice(inicio, fin);

  // Si hay búsqueda activa, obtener los términos y matches
  // let terminos = [];
  const matchesMap = {};
  const tableSearch = document.getElementById('table-search');
  if (tableSearch && tableSearch.value.trim().length >= 3 && fuse) {
    // Obtener matches de Fuse desde el tercer caracter
    const resultados = fuse.search(tableSearch.value.trim());
    resultados.forEach(res => {
      matchesMap[res.item.id] = res.matches;
    });
  }

  // Función para resaltar coincidencias
    function resaltar(texto, key, aptoId) {
      if (!matchesMap[aptoId]) return texto;
      const matches = matchesMap[aptoId].filter(m => m.key === key);
      if (matches.length === 0) return texto;
    // (Eliminado textoNorm, ya no es necesario)
      let resaltado = '';
      let lastIndex = 0;
      matches.forEach(match => {
        match.indices.forEach(([start, end]) => {
          resaltado += texto.substring(lastIndex, start);
          resaltado += `<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">${texto.substring(start, end + 1)}</mark>`;
          lastIndex = end + 1;
        });
      });
      resaltado += texto.substring(lastIndex);
      // Si no se resaltó nada (por ejemplo, solo coincidencias parciales), devolver el texto original
      if (resaltado === '' || resaltado === texto) return texto;
      return resaltado;
    }

  datosPagina.forEach(apto => {
    const tr = document.createElement('tr');
    // Badge clickeable para número de apartamento (resaltado)
    const badgeNumero = `<span class="bg-blue-100 text-blue-700 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer hover:bg-blue-200 hover:text-blue-900 hover:underline transition-colors" data-numero="${apto.numero || ''}">${resaltar(apto.numero || '', 'numero', apto.id)}</span>`;
    // Badge para estado
    let badgeEstado = '';
    switch ((apto.estado || '').toLowerCase()) {
      case 'ocupado':
        badgeEstado = '<span class="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-red-900 dark:text-red-300">Ocupado</span>';
        break;
      case 'desocupado':
        badgeEstado = '<span class="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-green-900 dark:text-green-300">Desocupado</span>';
        break;
      case 'en arriendo':
        badgeEstado = '<span class="bg-pink-100 text-pink-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-pink-900 dark:text-pink-300">En arriendo</span>';
        break;
      case 'en venta':
        badgeEstado = '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-yellow-900 dark:text-yellow-300">En venta</span>';
        break;
      default:
        badgeEstado = `<span class="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-gray-700 dark:text-gray-300">${apto.estado || ''}</span>`;
    }
    // Badge para rol
    let badgeRol = '';
    switch ((apto.rol || '').toLowerCase()) {
      case 'arrendatario':
        badgeRol = '<span class="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-blue-900 dark:text-blue-300">Arrendatario</span>';
        break;
      case 'propietario':
        badgeRol = '<span class="bg-indigo-100 text-indigo-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-indigo-900 dark:text-indigo-300">Propietario</span>';
        break;
      default:
        badgeRol = `<span class="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-gray-700 dark:text-gray-300">${apto.rol || ''}</span>`;
    }
    // Capitalizar cada palabra (nombres)
    function capitalizarNombre(str) {
      if (!str) return '';
      return str
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
    }
    // Capitalizar solo la primera letra (observaciones)
    function capitalizarObservacion(str) {
      if (!str) return '';
      const lower = str.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    // Crear celdas y usar innerHTML para aplicar el resaltado
    const tdNumero = document.createElement('td');
    tdNumero.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    tdNumero.innerHTML = badgeNumero;

    const tdEstado = document.createElement('td');
    tdEstado.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    tdEstado.innerHTML = badgeEstado;

    const tdNombre = document.createElement('td');
    tdNombre.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    tdNombre.innerHTML = resaltar(capitalizarNombre(apto.nombre) || '', 'nombre', apto.id);

    const tdContacto = document.createElement('td');
    tdContacto.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    tdContacto.textContent = apto.contacto || '';

    const tdRol = document.createElement('td');
    tdRol.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    tdRol.innerHTML = badgeRol;

    // Nueva columna para parqueadero
    const tdParqueadero = document.createElement('td');
    tdParqueadero.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    const parqueaderoAsignado = parqueaderosData[apto.numero];
    if (parqueaderoAsignado) {
      tdParqueadero.innerHTML = `<span class="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-blue-900 dark:text-blue-300">${parqueaderoAsignado}</span>`;
    } else {
      tdParqueadero.innerHTML = '<span class="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-gray-700 dark:text-gray-300">No asignado</span>';
    }

    const tdObs = document.createElement('td');
    tdObs.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-middle';
    
    // Limitar observaciones a 50 caracteres en la tabla
    const observacionCompleta = capitalizarObservacion(apto.observaciones) || '';
    const observacionCorta = observacionCompleta.length > 50 
      ? `${observacionCompleta.substring(0, 50)}...` 
      : observacionCompleta;
    
    tdObs.innerHTML = observacionCorta 
      ? `<span class="text-gray-700 dark:text-gray-300" title="${observacionCompleta}">${observacionCorta}</span>`
      : '<span class="text-gray-400 dark:text-gray-500 italic">Sin observaciones</span>';

    const tdHistorial = document.createElement('td');
    tdHistorial.className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center align-middle';
    tdHistorial.innerHTML = `
      <button 
        class="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200" 
        onclick="mostrarHistorialApartamento('${apto.id}', '${apto.numero}')"
        title="Ver historial de cambios"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
          <path d="M12 7v5l4 2"></path>  
        </svg>
      </button>
    `;

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'px-4 py-3 w-16 border-b border-gray-200 dark:border-gray-700 text-center align-middle';
    tdAcciones.innerHTML = `
      <button class="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none dark:text-gray-400 dark:hover:text-gray-100" onclick="mostrarMenuAccionesDirectorio(event, '${apto.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
    `;

    tr.appendChild(tdNumero);
    tr.appendChild(tdEstado);
    tr.appendChild(tdNombre);
    tr.appendChild(tdContacto);
    tr.appendChild(tdRol);
    tr.appendChild(tdParqueadero);
    tr.appendChild(tdObs);
    tr.appendChild(tdHistorial);
    tr.appendChild(tdAcciones);

    // Agregar evento al badge del número de apartamento
    setTimeout(() => {
      const badge = tr.querySelector('span[data-numero]');
      if (badge) {
        badge.addEventListener('click', () => {
          window.mostrarDetallesApartamento(apto.numero);
        });
      }
    }, 0);
    tbody.appendChild(tr);
  });

  // Actualizar rango y total en paginación
  const inicioRango = document.getElementById('inicio-rango-directorio');
  const finRango = document.getElementById('fin-rango-directorio');
  const totalItems = document.getElementById('total-items-directorio');
  const totalApartamentos = document.getElementById('total-apartamentos');
  const numeroPagina = document.getElementById('numero-pagina-directorio');
  if (inicioRango && finRango && totalItems && totalApartamentos && numeroPagina) {
    if (datos.length === 0) {
      inicioRango.textContent = '0';
      finRango.textContent = '0';
      totalItems.textContent = '0';
      totalApartamentos.textContent = '0';
      numeroPagina.textContent = '1';
    } else {
      const inicioMostrar = datos.length === 0 ? 0 : inicio + 1;
      const finMostrar = datos.length === 0 ? 0 : Math.min(inicio + datosPagina.length, datos.length);
      inicioRango.textContent = `${inicioMostrar}`;
      finRango.textContent = `${finMostrar}`;
      totalItems.textContent = `${datos.length}`;
      totalApartamentos.textContent = `${datos.length}`;
      numeroPagina.textContent = `${currentPage}`;
    }
  }
  // Mostrar/ocultar estado sin datos
  const sinDirectorio = document.getElementById('sin-directorio');
  if (sinDirectorio) {
    if (datos.length === 0) {
      sinDirectorio.classList.remove('hidden');
    } else {
      sinDirectorio.classList.add('hidden');
    }
  }

  // Mostrar/ocultar paginación según cantidad de registros
  const paginacion = document.getElementById('paginacion-directorio');
  if (paginacion) {
    if (datos.length > 10) {
      paginacion.classList.remove('hidden');
    } else {
      paginacion.classList.add('hidden');
    }
  }
}





// Función para liberar el parqueadero cuando se elimina un apartamento
async function liberarParqueaderoApartamento(numeroApartamento) {
  try {
    // Buscar el parqueadero asignado a este apartamento
    const qParqueaderos = query(collection(db, 'parqueaderos_residentes'));
    const snapshotParqueaderos = await getDocs(qParqueaderos);
    
    const parqueaderoAsignado = snapshotParqueaderos.docs.find(parqueaderoDoc => {
      const parqueadero = parqueaderoDoc.data();
      return parqueadero.apartamento === numeroApartamento;
    });
    
    if (parqueaderoAsignado) {
      // Liberar el parqueadero
      await updateDoc(doc(db, 'parqueaderos_residentes', parqueaderoAsignado.id), {
        apartamento: null,
        propietario: null,
        vehiculo: null,
        estado: 'libre'
      });
    }
  } catch (error) {
    // Error handling sin console
  }
}

async function actualizarTabla() {
// Mover aquí la definición de eliminarApartamento para evitar no-use-before-define
window.eliminarApartamento = async function eliminarApartamento(apartamentoId) {
  // Buscar el apartamento para obtener información antes de eliminarlo
  const apartamento = datosGlobal.find(a => a.id === apartamentoId);
  const numeroApartamento = apartamento?.numero || 'sin número';
  
  // Usar el modal de eliminación del historial
  window.mostrarModalEliminar(
    `¿Estás seguro de que quieres eliminar el apartamento ${numeroApartamento}?`,
    async () => {
      try {
        // Eliminar el apartamento de Firestore
        await deleteDoc(doc(db, 'directorio', apartamentoId));
        
        // Liberar el parqueadero asignado si existe el apartamento
        if (apartamento && apartamento.numero) {
          await liberarParqueaderoApartamento(apartamento.numero);
        }
        
        // Eliminar también todo el historial asociado
        await eliminarHistorialApartamento(apartamentoId);
        
        // *** ACTUALIZACIÓN EN TIEMPO REAL SIN RECARGA ***
        // 1. Eliminar de los datos globales
        const index = datosGlobal.findIndex(a => a.id === apartamentoId);
        if (index !== -1) {
          datosGlobal.splice(index, 1);
        }
        
        // 2. Eliminar de los datos filtrados si existen
        const filteredIndex = datosFiltrados.findIndex(a => a.id === apartamentoId);
        if (filteredIndex !== -1) {
          datosFiltrados.splice(filteredIndex, 1);
        }
        
        // 3. Encontrar y eliminar la fila del DOM
        const tbody = document.getElementById('tabla-directorio-body');
        const filas = tbody.getElementsByTagName('tr');
        for (let i = 0; i < filas.length; i += 1) {
          const fila = filas[i];
          // Buscar por el botón de acciones que contiene el apartamentoId
          const botonAcciones = fila.querySelector(`button[onclick*="${apartamentoId}"]`);
          if (botonAcciones) {
            // Animar la eliminación más rápida
            fila.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
            fila.style.opacity = '0';
            fila.style.transform = 'translateX(-20px)';
            setTimeout(() => {
              if (fila.parentNode) {
                fila.parentNode.removeChild(fila);
              }
            }, 150);
            break;
          }
        }
        
        // 4. Actualizar contadores sin recargar tabla
        actualizarContadoresDirectorio(datosGlobal);
        
        // 5. Actualizar total de apartamentos
        const totalApartamentos = document.getElementById('total-apartamentos');
        if (totalApartamentos) {
          totalApartamentos.textContent = datosGlobal.length;
        }
        
        // 6. Actualizar paginación si es necesario
        const registrosPorPagina = 20;
        const paginasTotal = Math.ceil(datosFiltrados.length / registrosPorPagina) || 1;
        if (currentPage > paginasTotal) {
          currentPage = Math.max(1, paginasTotal);
          await renderTabla(datosFiltrados);
        } else {
          // Actualizar solo los números de paginación
          const inicioRango = document.getElementById('inicio-rango-directorio');
          const finRango = document.getElementById('fin-rango-directorio');
          const totalItems = document.getElementById('total-items-directorio');
          const numeroPagina = document.getElementById('numero-pagina-directorio');
          
          if (inicioRango && finRango && totalItems && numeroPagina) {
            const inicio = (currentPage - 1) * registrosPorPagina;
            const inicioMostrar = datosFiltrados.length === 0 ? 0 : inicio + 1;
            const registrosEnPagina = Math.min(registrosPorPagina, datosFiltrados.length - inicio);
            const finMostrar = datosFiltrados.length === 0 ? 0 : inicio + registrosEnPagina;
            
            inicioRango.textContent = inicioMostrar;
            finRango.textContent = finMostrar;
            totalItems.textContent = datosFiltrados.length;
            numeroPagina.textContent = currentPage;
          }
        }
        
        // 7. Mostrar estado sin datos si es necesario
        const sinDirectorio = document.getElementById('sin-directorio');
        if (sinDirectorio && datosGlobal.length === 0) {
          sinDirectorio.classList.remove('hidden');
        }
        
        window.mostrarAlert(`Apartamento ${numeroApartamento} eliminado correctamente`, 'success');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error eliminando apartamento:', error);
        window.mostrarAlert(`Error al eliminar el apartamento: ${error.message}`, 'error');
      }
    }
  );
};

  const datos = await cargarDirectorio();
  datosGlobal = datos;
  // Inicializar Fuse con los datos actuales
  fuse = new Fuse(datosGlobal, fuseOptions);
  // Filtrado por estado (normalizando valores)
  const filtro = document.querySelector('input[name="filtro-estado-directorio"]:checked');
  let filtrados = datos;
  let filtroActivo = false;
  if (filtro && filtro.value !== 'todos') {
    const valorFiltro = filtro.value.trim().toLowerCase();
    filtrados = datos.filter(apto => (apto.estado || '').trim().toLowerCase() === valorFiltro);
    filtroActivo = true;
  }
  
  // Almacenar datos filtrados globalmente para la paginación
  datosFiltrados = filtrados;
  
  // Si hay búsqueda activa, mantenerla al recargar
  const tableSearch = document.getElementById('table-search');
  if (tableSearch && tableSearch.value.trim().length > 0 && fuse) {
    const resultados = fuse.search(tableSearch.value.trim()).map(r => r.item);
    datosFiltrados = resultados; // Actualizar con resultados de búsqueda
    await renderTabla(resultados);
  } else {
    await renderTabla(filtrados);
  }
  // Actualizar contadores
  actualizarContadoresDirectorio(datos);
  // Indicador visual de filtro activo
  const badge = document.getElementById('filtro-contador-directorio');
  if (badge) {
    if (filtroActivo) {
      badge.classList.remove('hidden');
      badge.textContent = `${filtrados.length}`;
    } else {
      badge.classList.add('hidden');
      badge.textContent = '';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Verificar que el script se carga correctamente

  // Inicializar UI del historial
  inicializarHistorialUI();

  // Búsqueda en tiempo real para el directorio
  const tableSearch = document.getElementById('table-search');
  if (tableSearch) {
    tableSearch.addEventListener('input', async function handleTableSearchInput() {
      const termino = this.value.trim();
      if (fuse && termino.length > 0) {
        const resultados = fuse.search(termino).map(r => r.item);
        datosFiltrados = resultados; // Actualizar datos filtrados
        currentPage = 1;
        await renderTabla(resultados);
      } else {
        // Restablecer al filtro actual sin búsqueda
        const filtro = document.querySelector('input[name="filtro-estado-directorio"]:checked');
        let filtrados = datosGlobal;
        if (filtro && filtro.value !== 'todos') {
          const valorFiltro = filtro.value.trim().toLowerCase();
          filtrados = datosGlobal.filter(apto => (apto.estado || '').trim().toLowerCase() === valorFiltro);
        }
        datosFiltrados = filtrados; // Actualizar datos filtrados
        currentPage = 1;
        await renderTabla(filtrados);
      }
    });
  }

  // Mostrar/ocultar botón limpiar filtro según filtro activo
  const btnLimpiarFiltro = document.getElementById('btn-limpiar-filtro-directorio');
  const radiosFiltro = document.querySelectorAll('input[name="filtro-estado-directorio"]');
  function actualizarBotonLimpiarFiltro() {
    const filtro = document.querySelector('input[name="filtro-estado-directorio"]:checked');
    if (btnLimpiarFiltro) {
      if (filtro && filtro.value !== 'todos') {
        btnLimpiarFiltro.style.display = '';
      } else {
        btnLimpiarFiltro.style.display = 'none';
      }
    }
  }
  radiosFiltro.forEach(radio => {
    radio.addEventListener('change', actualizarBotonLimpiarFiltro);
  });
  actualizarBotonLimpiarFiltro();
  if (btnLimpiarFiltro) {
    btnLimpiarFiltro.addEventListener('click', async () => {
      // Seleccionar el radio 'todos' y actualizar la tabla
      const radioTodos = document.querySelector('input[name="filtro-estado-directorio"][value="todos"]');
      if (radioTodos) {
        radioTodos.checked = true;
        if (typeof currentPage !== 'undefined') {
          currentPage = 1;
        }
        await actualizarTabla();
        actualizarBotonLimpiarFiltro();
      }
    });
  }
  // Paginación: botones
  const btnAnterior = document.getElementById('btn-anterior-directorio');
  const btnSiguiente = document.getElementById('btn-siguiente-directorio');
  const btnPrimera = document.getElementById('btn-primera-directorio');
  const btnUltima = document.getElementById('btn-ultima-directorio');

  if (btnAnterior) {
    btnAnterior.addEventListener('click', async () => {
      if (currentPage > 1) {
        currentPage -= 1;
        await renderTabla(datosFiltrados);
      }
    });
  }
  if (btnSiguiente) {
    btnSiguiente.addEventListener('click', async () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        await renderTabla(datosFiltrados);
      }
    });
  }
  if (btnPrimera) {
    btnPrimera.addEventListener('click', async () => {
      if (currentPage !== 1) {
        currentPage = 1;
        await renderTabla(datosFiltrados);
      }
    });
  }
  if (btnUltima) {
    btnUltima.addEventListener('click', async () => {
      if (currentPage !== totalPages) {
        currentPage = totalPages;
        await renderTabla(datosFiltrados);
      }
    });
  }
  // Filtro: mostrar/ocultar dropdown
  const btnFiltrar = document.getElementById('btn-filtrar-directorio');
  const dropdownFiltros = document.getElementById('dropdown-filtros-directorio');
  if (btnFiltrar && dropdownFiltros) {
    btnFiltrar.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownFiltros.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!dropdownFiltros.contains(e.target) && e.target !== btnFiltrar) {
        dropdownFiltros.classList.add('hidden');
      }
    });
  }
  // Filtro: aplicar filtro al cambiar radio
  const radios = document.querySelectorAll('input[name="filtro-estado-directorio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', async () => {
      currentPage = 1; // Restablecer a página 1 al cambiar filtro
      await actualizarTabla();
      dropdownFiltros.classList.add('hidden');
    });
  });
  const modal = document.getElementById('modal-apartamento');
  const btnAbrir = document.getElementById('btn-abrir-modal-apto');
  const btnAbrir2 = document.getElementById('btn-abrir-modal-apto-2');
  const btnCerrar = document.getElementById('cerrar-modal-apto');
  const btnCancelar = document.getElementById('cancelar-modal-apto');
  const form = document.getElementById('form-apartamento');

  if (btnAbrir && modal) {
    btnAbrir.addEventListener('click', async () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      // Habilitar campo número al crear
      const formApto = document.getElementById('form-apartamento');
      if (formApto && formApto.elements.numero) {
        formApto.elements.numero.disabled = false;
      }
      
      // Cargar parqueaderos disponibles cuando se abre el modal
      poblarSelectParqueaderos();
      setTimeout(() => {
        document.addEventListener('keydown', cerrarModalPrincipalConEsc);
      }, 100);
    });
  }

  // Event listener para el segundo botón (cuando no hay apartamentos)
  if (btnAbrir2 && modal) {
    btnAbrir2.addEventListener('click', async () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      // Habilitar campo número al crear
      const formApto = document.getElementById('form-apartamento');
      if (formApto && formApto.elements.numero) {
        formApto.elements.numero.disabled = false;
      }
      
      // Cargar parqueaderos disponibles cuando se abre el modal
      poblarSelectParqueaderos();
      setTimeout(() => {
        document.addEventListener('keydown', cerrarModalPrincipalConEsc);
      }, 100);
    });
  }
  if (btnCerrar && modal) {
    btnCerrar.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.removeEventListener('keydown', cerrarModalPrincipalConEsc);
    });
  }
  if (btnCancelar && modal) {
    btnCancelar.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.removeEventListener('keydown', cerrarModalPrincipalConEsc);
    });
  }
  if (form && modal) {
    // Crear mensajes de error debajo de los inputs
    const numeroInput = form.elements.numero;
    const contactoInput = form.elements.contacto;
    const nombreInput = form.elements.nombre;
    const errorNumero = document.createElement('div');
    errorNumero.style.color = 'red';
    errorNumero.style.fontSize = '0.875rem';
    errorNumero.style.marginTop = '0.25rem';
    errorNumero.style.display = 'none';
    numeroInput.parentNode.appendChild(errorNumero);
    const errorContacto = document.createElement('div');
    errorContacto.style.color = 'red';
    errorContacto.style.fontSize = '0.875rem';
    errorContacto.style.marginTop = '0.25rem';
    errorContacto.style.display = 'none';
    contactoInput.parentNode.appendChild(errorContacto);
    const errorNombre = document.createElement('div');
    errorNombre.style.color = 'red';
    errorNombre.style.fontSize = '0.875rem';
    errorNombre.style.marginTop = '0.25rem';
    errorNombre.style.display = 'none';
    nombreInput.parentNode.appendChild(errorNombre);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valido = true;
      // Validar número de apartamento: solo números
      if (!numeroInput.value.match(/^\d+$/)) {
        numeroInput.classList.add('border-red-500');
        numeroInput.focus();
        errorNumero.textContent = 'Solo se permiten números en el apartamento.';
        errorNumero.style.display = 'block';
        valido = false;
      } else {
        numeroInput.classList.remove('border-red-500');
        errorNumero.style.display = 'none';
      }
      // Validar contacto: solo celular colombiano (10 dígitos, inicia en 3)
      if (!contactoInput.value.match(/^3\d{9}$/)) {
        contactoInput.classList.add('border-red-500');
        contactoInput.focus();
        errorContacto.textContent = 'Ingrese un número de celular válido de 10 dígitos que inicie en 3.';
        errorContacto.style.display = 'block';
        valido = false;
      } else {
        contactoInput.classList.remove('border-red-500');
        errorContacto.style.display = 'none';
      }
      // Validar nombre: solo letras y espacios
      if (!nombreInput.value.match(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)) {
        nombreInput.classList.add('border-red-500');
        nombreInput.focus();
        errorNombre.textContent = 'Solo se permiten letras y espacios en el nombre.';
        errorNombre.style.display = 'block';
        valido = false;
      } else {
        nombreInput.classList.remove('border-red-500');
        errorNombre.style.display = 'none';
      }
      if (!valido) return;
      
      const data = Object.fromEntries(new FormData(form));
      
      const editId = form.getAttribute('data-edit-id');
      if (editId) {
        await actualizarApartamento(editId, data);
        form.removeAttribute('data-edit-id');
      } else {
        await guardarApartamento(data);
      }
      limpiarFormulario(form);
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      actualizarTabla();
    });
    // Validación en tiempo real para número de apartamento
    numeroInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d]/g, '');
      if (!e.target.value.match(/^\d+$/)) {
        errorNumero.textContent = 'Solo se permiten números en el apartamento.';
        errorNumero.style.display = 'block';
        numeroInput.classList.add('border-red-500');
      } else {
        errorNumero.style.display = 'none';
        numeroInput.classList.remove('border-red-500');
      }
    });
    // Validación en tiempo real para contacto
    contactoInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d]/g, '');
      if (!e.target.value.match(/^3\d{9}$/)) {
        errorContacto.textContent = 'Ingrese un número de celular válido de 10 dígitos que inicie en 3.';
        errorContacto.style.display = 'block';
        contactoInput.classList.add('border-red-500');
      } else {
        errorContacto.style.display = 'none';
        contactoInput.classList.remove('border-red-500');
      }
    });
    // Validación en tiempo real para nombre
    nombreInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '');
      if (!e.target.value.match(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)) {
        errorNombre.textContent = 'Solo se permiten letras y espacios en el nombre.';
        errorNombre.style.display = 'block';
        nombreInput.classList.add('border-red-500');
      } else {
        errorNombre.style.display = 'none';
        nombreInput.classList.remove('border-red-500');
      }
    });
  }
  actualizarTabla();
});



// Función para cerrar el modal principal con Esc

// Función para mostrar detalles de un apartamento por número
window.mostrarDetallesApartamento = function mostrarDetallesApartamento(numero) {
  const apto = datosGlobal.find(a => a.numero === numero);
  if (!apto) return;
  window.verApartamento(apto.id);
}
