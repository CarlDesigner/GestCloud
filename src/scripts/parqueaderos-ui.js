import { addDoc, collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

const form = document.getElementById('form-parqueadero');
const message = document.getElementById('msg-parqueadero');
const cardsContainer = document.getElementById('cards-parqueaderos');

// Variable global para el filtro actual
let filtroActual = 'todos'; // 'todos', 'ocupados', 'libres'
let parqueaderosGlobales = []; // Almacenar los datos para filtrado

// Función para formatear nombres con primera letra en mayúscula
function formatearNombre(nombre) {
  if (!nombre) return '';
  return nombre
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// Función para formatear placas colombianas (ABC-123 o ABC123)
function formatearPlaca(placa) {
  if (!placa) return '';
  // Remover espacios y guiones existentes, convertir a mayúsculas
  const placaLimpia = placa.replace(/[\s-]/g, '').toUpperCase();
  
  // Verificar si tiene el formato correcto (3 letras + 3 números)
  if (placaLimpia.length === 6 && /^[A-Z]{3}[0-9]{3}$/.test(placaLimpia)) {
    return `${placaLimpia.substring(0, 3)}-${placaLimpia.substring(3)}`;
  }
  
  // Si no tiene el formato esperado, devolver tal como está
  return placa;
}

// Función para configurar la posición del tooltip dinámicamente
function setupTooltipPosition(card) {
  const tooltipWrapper = card.querySelector('.tooltip-wrapper');
  const tooltipContent = card.querySelector('.tooltip-content');
  const tooltipArrow = card.querySelector('.tooltip-arrow');
  
  if (!tooltipWrapper || !tooltipContent || !tooltipArrow) return;
  
  card.addEventListener('mouseenter', () => {
    const cardRect = card.getBoundingClientRect();
    const containerRect = card.closest('#cards-parqueaderos').getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    const tooltipHeight = 120;
    
    // Calcular posición relativa dentro del contenedor
    const relativeLeft = cardRect.left - containerRect.left;
    const relativeTop = cardRect.top - containerRect.top;
    const containerWidth = containerRect.width;
    
    // Resetear clases
    tooltipWrapper.className = 'tooltip-wrapper absolute z-50 pointer-events-none';
    tooltipArrow.className = 'tooltip-arrow absolute w-0 h-0 border-4 border-transparent';
    
    // Determinar posición horizontal
    let horizontalPosition = '';
    let arrowPosition = '';
    
    if (relativeLeft < tooltipWidth / 2) {
      // Muy cerca del borde izquierdo - alinear tooltip a la izquierda
      horizontalPosition = 'left-0';
      arrowPosition = 'left-6';
      tooltipArrow.className += ' border-t-gray-900 dark:border-t-gray-800 top-full';
    } else if (relativeLeft > containerWidth - tooltipWidth / 2) {
      // Muy cerca del borde derecho - alinear tooltip a la derecha
      horizontalPosition = 'right-0';
      arrowPosition = 'right-6';
      tooltipArrow.className += ' border-t-gray-900 dark:border-t-gray-800 top-full';
    } else {
      // Centro - posición normal
      horizontalPosition = 'left-1/2 transform -translate-x-1/2';
      arrowPosition = 'left-1/2 transform -translate-x-1/2';
      tooltipArrow.className += ' border-t-gray-900 dark:border-t-gray-800 top-full';
    }
    
    // Determinar posición vertical
    let verticalPosition = '';
    if (relativeTop < tooltipHeight) {
      // Muy cerca del borde superior - mostrar abajo
      verticalPosition = 'top-full mt-2';
      tooltipArrow.className = tooltipArrow.className.replace('border-t-gray-900 dark:border-t-gray-800 top-full', 'border-b-gray-900 dark:border-b-gray-800 bottom-full');
    } else {
      // Posición normal - mostrar arriba
      verticalPosition = 'bottom-full mb-2';
    }
    
    // Aplicar posicionamiento
    tooltipWrapper.className += ` ${verticalPosition} ${horizontalPosition}`;
    tooltipArrow.className += ` ${arrowPosition}`;
  });
}

function renderCards(parqueaderos) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = '';
  
  // Aplicar filtro
  let parqueaderosFiltrados = parqueaderos;
  if (filtroActual === 'ocupados') {
    parqueaderosFiltrados = parqueaderos.filter(p => p.estado === 'ocupado');
  } else if (filtroActual === 'libres') {
    parqueaderosFiltrados = parqueaderos.filter(p => p.estado === 'libre');
  }
  
  // Calcular contadores (siempre basados en todos los parqueaderos)
  const total = parqueaderos.length;
  const ocupados = parqueaderos.filter(p => p.estado === 'ocupado').length;
  const libres = total - ocupados;
  
  // Actualizar contadores en la UI
  const contadorTotal = document.getElementById('contador-total');
  const contadorLibres = document.getElementById('contador-libres');
  const contadorOcupados = document.getElementById('contador-ocupados');
  
  if (contadorTotal) contadorTotal.textContent = total;
  if (contadorLibres) contadorLibres.textContent = libres;
  if (contadorOcupados) contadorOcupados.textContent = ocupados;
  
  // Ordenar por número ascendente (V-1, V-2, ...)
  parqueaderosFiltrados.sort((a, b) => {
    const getNum = (id) => {
      const match = (id || '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getNum(a.id) - getNum(b.id);
  });
  
  parqueaderosFiltrados.forEach(p => {
    const card = document.createElement('div');
    const isOcupado = p.estado === 'ocupado';
    
    // Clases base para la card
    let cardClasses = "relative flex flex-col items-center justify-center border rounded-xl shadow min-h-[120px] w-[110px] mx-auto py-3 px-2 transition-all duration-200 cursor-pointer";
    
    // Colores según estado
    if (isOcupado) {
      cardClasses += " bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30";
    } else {
      cardClasses += " bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30";
    }
    
    card.className = cardClasses;
    
    // Tooltip para parqueaderos ocupados con posicionamiento inteligente
    const visitanteTooltip = isOcupado && p.visitante ? `
      <div class="tooltip-wrapper absolute z-50 pointer-events-none">
        <div class="tooltip-content w-72 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-3 px-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl border border-gray-700">
          <div class="space-y-2">
            <div class="font-semibold text-yellow-400 text-sm">${formatearNombre(p.visitante)}</div>
            ${p.vehiculo ? `<div class="font-mono text-blue-300 text-sm">${formatearPlaca(p.vehiculo)}</div>` : ''}
            ${p.apartamento ? `<div class="text-green-300">Apto ${p.apartamento}</div>` : ''}
            <div class="text-gray-300 text-xs mt-2 pt-2 border-t border-gray-600">Información del visitante</div>
          </div>
          <div class="tooltip-arrow absolute w-0 h-0 border-4 border-transparent"></div>
        </div>
      </div>
    ` : '';
    
    // Contenido de la card
    card.innerHTML = `
      <div class="group relative">
        <div class="flex-1 flex items-center justify-center w-full mb-2">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="18" stroke="${isOcupado ? '#dc2626' : '#16a34a'}" stroke-width="2.5" fill="none" />
            <text x="50%" y="56%" text-anchor="middle" fill="${isOcupado ? '#dc2626' : '#16a34a'}" font-size="24" font-family="Arial, sans-serif" font-weight="bold" dominant-baseline="middle">P</text>
          </svg>
        </div>
        
        <div class="flex items-center justify-center w-full mb-2">
          <span class="px-2 py-1 text-xs font-semibold rounded ${isOcupado ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600' : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600'} tracking-wide">
            ${p.id || p.data?.id || 'N/A'}
          </span>
        </div>
        
        <div class="text-center w-full">
          <div class="text-xs font-medium ${isOcupado ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}">
            ${isOcupado ? 'OCUPADO' : 'LIBRE'}
          </div>
        </div>
        
        ${visitanteTooltip}
      </div>
    `;
    
    cardsContainer.appendChild(card);
    
    // Si es un parqueadero ocupado, configurar el tooltip después de agregarlo al DOM
    if (isOcupado && p.visitante) {
      setTimeout(() => {
        setupTooltipPosition(card);
      }, 0);
    }
  });
}

async function fetchParqueaderos() {
  const q = query(collection(db, 'parqueaderos_visitantes'), orderBy('id'));
  const snapshot = await getDocs(q);
  parqueaderosGlobales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderCards(parqueaderosGlobales);
}

// Cambiar a escucha en tiempo real
function escucharParqueaderos() {
  const q = query(collection(db, 'parqueaderos_visitantes'), orderBy('id'));
  
  return onSnapshot(q, (snapshot) => {
    parqueaderosGlobales = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    renderCards(parqueaderosGlobales);
  }, () => {
    // Fallback a fetch normal si hay error
    fetchParqueaderos();
  });
}

// Función para cambiar el filtro de parqueaderos
function cambiarFiltro(nuevoFiltro) {
  filtroActual = nuevoFiltro;
  
  // Actualizar estilos de los contadores-botón
  const contadores = document.querySelectorAll('.contador-btn');
  contadores.forEach(contador => {
    const filtro = contador.getAttribute('data-filtro');
    
    // Resetear estilos a estado normal
    contador.classList.remove('shadow-lg', 'transform', 'scale-105');
    
    if (filtro === 'libres') {
      contador.classList.remove('bg-green-100', 'dark:bg-green-800/40', 'border-green-400', 'dark:border-green-600');
      contador.classList.add('bg-green-50', 'dark:bg-green-900/20', 'border-green-200', 'dark:border-green-800');
    } else if (filtro === 'ocupados') {
      contador.classList.remove('bg-red-100', 'dark:bg-red-800/40', 'border-red-400', 'dark:border-red-600');
      contador.classList.add('bg-red-50', 'dark:bg-red-900/20', 'border-red-200', 'dark:border-red-800');
    } else if (filtro === 'todos') {
      contador.classList.remove('bg-blue-100', 'dark:bg-blue-800/40', 'border-blue-400', 'dark:border-blue-600');
      contador.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800');
    }
  });
  
  // Aplicar estilo activo al contador seleccionado con efecto más sutil
  const contadorActivo = document.querySelector(`[data-filtro="${nuevoFiltro}"]`);
  if (contadorActivo) {
    contadorActivo.classList.add('shadow-lg', 'transform', 'scale-105');
    
    if (nuevoFiltro === 'libres') {
      contadorActivo.classList.remove('bg-green-50', 'dark:bg-green-900/20', 'border-green-200', 'dark:border-green-800');
      contadorActivo.classList.add('bg-green-100', 'dark:bg-green-800/40', 'border-green-400', 'dark:border-green-600');
    } else if (nuevoFiltro === 'ocupados') {
      contadorActivo.classList.remove('bg-red-50', 'dark:bg-red-900/20', 'border-red-200', 'dark:border-red-800');
      contadorActivo.classList.add('bg-red-100', 'dark:bg-red-800/40', 'border-red-400', 'dark:border-red-600');
    } else if (nuevoFiltro === 'todos') {
      contadorActivo.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800');
      contadorActivo.classList.add('bg-blue-100', 'dark:bg-blue-800/40', 'border-blue-400', 'dark:border-blue-600');
    }
  }
  
  // Re-renderizar con el nuevo filtro usando los datos globales
  renderCards(parqueaderosGlobales);
}

// Exponer la función globalmente para uso en HTML
window.cambiarFiltro = cambiarFiltro;

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let id = form.id.value.trim();
    const tipo = 'visitante';
    // Normalizar el ID: V-5
    id = id.toUpperCase().replace(/^(V|R)[- ]?(\d+)$/i, (match, letra, num) => `V-${num}`);
    if (!/^V-\d+$/.test(id)) {
      id = id.replace(/\D/g, '');
      id = `V-${id}`;
    }
    // Validar que no exista el ID
    const q = query(collection(db, 'parqueaderos_visitantes'));
    const snapshot = await getDocs(q);
    const existe = snapshot.docs.some(doc => (doc.data().id || '').toUpperCase() === id);
    if (existe) {
      if (message) {
        message.textContent = `Ya existe un parqueadero con el ID ${id}`;
        message.className = 'text-sm text-red-600';
      }
      return;
    }
    try {
      await addDoc(collection(db, 'parqueaderos_visitantes'), {
        id,
        tipo,
        estado: 'libre',
        visitante: null,
        vehiculo: null,
        apartamento: null,
      });
      if (message) {
        message.textContent = `Parqueadero ${id} agregado con éxito`;
        message.className = 'text-sm text-green-600';
      }
      form.reset();
      // No necesitamos fetchParqueaderos() porque onSnapshot se actualiza automáticamente
    } catch (err) {
      if (message) {
        message.textContent = 'Error agregando parqueadero';
        message.className = 'text-sm text-red-600';
      }
    }
  });
}

// Iniciar escucha en tiempo real
escucharParqueaderos();

// Inicializar filtro por defecto después de que se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
  // Establecer "Total" como seleccionado por defecto
  setTimeout(() => cambiarFiltro('todos'), 100);
});
