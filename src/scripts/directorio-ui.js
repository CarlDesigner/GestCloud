
import Fuse from 'fuse.js';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';






let datosGlobal = [];

// --- Funciones principales: deben ir antes de cualquier uso ---









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
    document.removeEventListener('keydown', cerrarModalPrincipalConEsc);
  }
}

// --- Fin funciones principales ---
// Función para ver detalles de un apartamento
window.verApartamento = function verApartamento(apartamentoId) {
  const apto = datosGlobal.find(a => a.id === apartamentoId);
  if (!apto) return;
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
window.editarApartamento = function editarApartamento(apartamentoId) {
  const apto = datosGlobal.find(a => a.id === apartamentoId);
  if (!apto) return;
  const modal = document.getElementById('modal-apartamento');
  const form = document.getElementById('form-apartamento');
  if (!modal || !form) return;
  // Rellenar el formulario con los datos
  form.elements.numero.value = apto.numero || '';
  form.elements.estado.value = apto.estado || '';
  form.elements.nombre.value = apto.nombre || '';
  form.elements.contacto.value = apto.contacto || '';
  form.elements.rol.value = apto.rol || '';
  form.elements.observaciones.value = apto.observaciones || '';
  // Guardar el id editando
  form.setAttribute('data-edit-id', apartamentoId);
  modal.classList.remove('hidden');
};

// Eliminado: submit duplicado. Toda la lógica de submit está centralizada en el bloque DOMContentLoaded más abajo.

// Modal de confirmación reutilizable
function mostrarModalConfirmacion(mensaje, onConfirm) {
  // Eliminar cualquier modal previo
  const modalExistente = document.getElementById('modal-confirmacion-directorio');
  if (modalExistente) modalExistente.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-confirmacion-directorio';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-auto">
      <div class="mb-4 text-gray-900 dark:text-gray-100 text-center">${mensaje}</div>
      <div class="flex justify-center gap-4">
        <button id="btn-cancelar-confirmacion" class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancelar</button>
        <button id="btn-confirmar-confirmacion" class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Cerrar modal
  let cerrarConEsc;
  const cerrar = () => {
    modal.remove();
    document.removeEventListener('keydown', cerrarConEsc);
  };
  cerrarConEsc = (e) => {
    if (e.key === 'Escape') cerrar();
  };
  setTimeout(() => {
    document.addEventListener('keydown', cerrarConEsc);
  }, 100);
  document.getElementById('btn-cancelar-confirmacion').onclick = cerrar;
  document.getElementById('btn-confirmar-confirmacion').onclick = () => {
    cerrar();
    onConfirm();
  };
}

// Función para actualizar apartamento en Firestore
async function actualizarApartamento(id, data) {
  // Verificar si el nuevo número ya existe en otro registro
  const q = query(collection(db, 'directorio'));
  const snapshot = await getDocs(q);
  const existe = snapshot.docs.some(d => d.id !== id && d.data().numero === data.numero);
  if (existe) {
    mostrarModalConfirmacion('Ya existe otro apartamento con ese número.', () => {});
    return;
  }
  await updateDoc(doc(db, 'directorio', id), data);
}






let currentPage = 1;
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
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true
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
  // Mapear y asignar fechaCreacion=0 si no existe
  const datos = snapshot.docs.map(documento => {
    const data = documento.data();
    return {
      id: documento.id,
      ...data,
      fechaCreacion: data.fechaCreacion || 0
    };
  });
  // Ordenar: primero por fechaCreacion descendente, luego por número ascendente
  return datos.sort((a, b) => {
    if (b.fechaCreacion !== a.fechaCreacion) {
      return b.fechaCreacion - a.fechaCreacion;
    }
    // Si ambos son antiguos, ordenar por número
    return (a.numero || '').localeCompare(b.numero || '', undefined, { numeric: true });
  });
}

async function guardarApartamento(data) {
  // Verificar si ya existe un apartamento con el mismo número
  const q = query(collection(db, 'directorio'));
  const snapshot = await getDocs(q);
  const existe = snapshot.docs.some(documento => documento.data().numero === data.numero);
  if (existe) {
    mostrarModalConfirmacion('Ya existe un apartamento con ese número.', () => {});
    return;
  }
  // Agregar campo de fecha de creación
  await addDoc(collection(db, 'directorio'), { ...data, fechaCreacion: Date.now() });
}



function limpiarFormulario(form) {
  form.reset();
}

// --- Mover funciones para cumplir no-use-before-define globalmente ---




// --- Mover funciones para cumplir no-use-before-define ---




function renderTabla(datos) {
  const tbody = document.getElementById('tabla-directorio-body');
  tbody.innerHTML = '';
  // Paginación
  const registrosPorPagina = 10;
  totalPages = Math.ceil(datos.length / registrosPorPagina) || 1;
  const inicio = (currentPage - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datos.slice(inicio, fin);

  // Si hay búsqueda activa, obtener los términos y matches
  // let terminos = [];
  const matchesMap = {};
  const tableSearch = document.getElementById('table-search');
  if (tableSearch && tableSearch.value.trim().length > 0 && fuse) {
    // const terminos = tableSearch.value.trim().split(/\s+/); // No se usa
    // Obtener matches de Fuse
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
    tdNumero.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdNumero.innerHTML = badgeNumero;

    const tdEstado = document.createElement('td');
    tdEstado.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdEstado.innerHTML = badgeEstado;

    const tdNombre = document.createElement('td');
    tdNombre.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdNombre.innerHTML = resaltar(capitalizarNombre(apto.nombre) || '', 'nombre', apto.id);

    const tdContacto = document.createElement('td');
    tdContacto.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdContacto.textContent = apto.contacto || '';

    const tdRol = document.createElement('td');
    tdRol.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdRol.innerHTML = badgeRol;

    const tdObs = document.createElement('td');
    tdObs.className = 'px-4 py-2 border-b border-gray-200 dark:border-gray-700';
    tdObs.textContent = capitalizarObservacion(apto.observaciones) || '';

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'px-4 py-2 w-16 border-b border-gray-200 dark:border-gray-700';
    tdAcciones.innerHTML = `<div class="flex items-center justify-end">
      <button class="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none dark:text-gray-400 dark:hover:text-gray-100" onclick="mostrarMenuAccionesDirectorio(event, '${apto.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
    </div>`;

    tr.appendChild(tdNumero);
    tr.appendChild(tdEstado);
    tr.appendChild(tdNombre);
    tr.appendChild(tdContacto);
    tr.appendChild(tdRol);
    tr.appendChild(tdObs);
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





async function actualizarTabla() {
// Mover aquí la definición de eliminarApartamento para evitar no-use-before-define
window.eliminarApartamento = function eliminarApartamento(apartamentoId) {
  mostrarModalConfirmacion('¿Seguro que deseas eliminar este apartamento?', async () => {
    await deleteDoc(doc(db, 'directorio', apartamentoId));
    actualizarTabla();
  });
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
  // Si hay búsqueda activa, mantenerla al recargar
  const tableSearch = document.getElementById('table-search');
  if (tableSearch && tableSearch.value.trim().length > 0 && fuse) {
    const resultados = fuse.search(tableSearch.value.trim()).map(r => r.item);
    renderTabla(resultados);
  } else {
    renderTabla(filtrados);
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
  // Búsqueda en tiempo real para el directorio
  const tableSearch = document.getElementById('table-search');
  if (tableSearch) {
    tableSearch.addEventListener('input', function handleTableSearchInput() {
      const termino = this.value.trim();
      if (fuse && termino.length > 0) {
        const resultados = fuse.search(termino).map(r => r.item);
        currentPage = 1;
        renderTabla(resultados);
      } else {
        currentPage = 1;
        renderTabla(datosGlobal);
      }
    });
  }
  // Paginación: botones
  const btnAnterior = document.getElementById('btn-anterior-directorio');
  const btnSiguiente = document.getElementById('btn-siguiente-directorio');
  if (btnAnterior) {
    btnAnterior.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderTabla(datosGlobal);
      }
    });
  }
  if (btnSiguiente) {
    btnSiguiente.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        renderTabla(datosGlobal);
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
    radio.addEventListener('change', () => {
      actualizarTabla();
      dropdownFiltros.classList.add('hidden');
    });
  });
  const modal = document.getElementById('modal-apartamento');
  const btnAbrir = document.getElementById('btn-abrir-modal-apto');
  const btnCerrar = document.getElementById('cerrar-modal-apto');
  const btnCancelar = document.getElementById('cancelar-modal-apto');
  const form = document.getElementById('form-apartamento');

  if (btnAbrir && modal) {
    btnAbrir.addEventListener('click', () => {
      modal.classList.remove('hidden');
      setTimeout(() => {
        document.addEventListener('keydown', cerrarModalPrincipalConEsc);
      }, 100);
    });
  }
  if (btnCerrar && modal) {
    btnCerrar.addEventListener('click', () => {
      modal.classList.add('hidden');
      document.removeEventListener('keydown', cerrarModalPrincipalConEsc);
    });
  }
  if (btnCancelar && modal) {
    btnCancelar.addEventListener('click', () => {
      modal.classList.add('hidden');
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
