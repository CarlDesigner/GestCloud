// Script principal para la interfaz de Visitantes Activos - GestCloud
// Este archivo maneja toda la lógica de la UI del módulo VisitantesActivos.astro

document.addEventListener('DOMContentLoaded', () => {
	// Elementos del DOM
	const sinVisitantes = document.getElementById('sin-visitantes');
	const gridVisitantes = document.getElementById('grid-visitantes');
	const contadorVisitantes = document.getElementById('contador-visitantes');
	const templateCard = document.getElementById('template-card-visitante');
	const buscarVisitante = document.getElementById('buscar-visitante');
	
	let visitantesActivos = [];
	let visitantesFiltrados = [];
	let filtroActual = 'todos';
	let unsubscribe = null;
	let intervalCronometro = null;
	let isLoading = true;

	// Variables para Fuse.js (búsqueda avanzada)
	let fuse = null;
	let fuseInitialized = false;

	// Configuración de Fuse.js para búsqueda inteligente en visitantes activos
	const fuseOptions = {
		keys: [
			{ name: 'nombre', weight: 0.3 },
			{ name: 'cedula', weight: 0.25 },
			{ name: 'apartamento', weight: 0.2 },
			{ name: 'vehiculo.placa', weight: 0.15 },
			{ name: 'vehiculo.parqueadero', weight: 0.1 }
		],
		threshold: 0.3,
		includeScore: true,
		minMatchCharLength: 2,
		ignoreLocation: true,
		findAllMatches: true
	};

	// Función para inicializar Fuse.js para visitantes activos
	async function inicializarFuseActivos() {
		if (!fuseInitialized && visitantesActivos.length > 0) {
			try {
				const Fuse = (await import('fuse.js')).default;
				fuse = new Fuse(visitantesActivos, fuseOptions);
				fuseInitialized = true;
			} catch (error) {
				// Fallback a búsqueda simple si falla Fuse.js
				fuse = null;
			}
		}
	}

	// Función de búsqueda para visitantes activos
	function buscarVisitantes(termino) {
		if (!termino || termino.length < 2) {
			return [...visitantesActivos];
		}

		// Limpiar término de búsqueda para cédulas y celulares (remover puntos, espacios y guiones)
		const terminoLimpio = termino.replace(/[.\s-]/g, '');
		
		// PRIORIDAD 1: Si es una búsqueda de solo números (cédula o celular), hacer búsqueda directa
		if (/^\d+$/.test(terminoLimpio)) {
			return visitantesActivos.filter(visitante => {
				const cedulaLimpia = visitante.cedula.toString().replace(/[.\s-]/g, '');
				const cedulaOriginal = visitante.cedula.toString();
				const celularLimpio = visitante.celular.toString().replace(/[.\s-]/g, '');
				const celularOriginal = visitante.celular.toString();
				const aptoLimpio = visitante.apartamento.toString().replace(/[.\s-]/g, '');
				const aptoOriginal = visitante.apartamento.toString();
				// Buscar en placa (solo números)
				let placaNumeros = '';
				let placaOriginal = '';
				if (visitante.vehiculo && visitante.vehiculo.placa) {
					placaOriginal = visitante.vehiculo.placa.toString();
					placaNumeros = placaOriginal.replace(/[^0-9]/g, '');
				}
				return (
					cedulaLimpia.includes(terminoLimpio) ||
					cedulaOriginal.includes(termino) ||
					cedulaLimpia === terminoLimpio ||
					cedulaOriginal === termino ||
					celularLimpio.includes(terminoLimpio) ||
					celularOriginal.includes(termino) ||
					celularLimpio === terminoLimpio ||
					celularOriginal === termino ||
					aptoLimpio.includes(terminoLimpio) ||
					aptoOriginal.includes(termino) ||
					aptoLimpio === terminoLimpio ||
					aptoOriginal === termino ||
					(placaNumeros && placaNumeros.includes(terminoLimpio)) ||
					(placaOriginal && placaOriginal.includes(termino))
				);
			});
		}

		// PRIORIDAD 2: Si es una placa (3 letras + 3 números), buscar por placa
		if (/^[A-Z]{3}\d{3}$/.test(termino.toUpperCase().replace(/[-\s]/g, ''))) {
			const placaLimpia = termino.toUpperCase().replace(/[-\s]/g, '');
			return visitantesActivos.filter(visitante =>
				visitante.vehiculo && (
					visitante.vehiculo.placa.toUpperCase().replace(/[-\s]/g, '').includes(placaLimpia) ||
					visitante.vehiculo.placa.toUpperCase().includes(termino.toUpperCase())
				)
			);
		}

		// PRIORIDAD 3: Para búsquedas de texto general, hacer búsqueda manual primero
		const terminoLower = termino.toLowerCase();
		const resultadosManual = visitantesActivos.filter(visitante => {
			const cedulaLimpia = visitante.cedula.toString().replace(/[.\s-]/g, '');
			const cedulaOriginal = visitante.cedula.toString();
			
			return visitante.nombre.toLowerCase().includes(terminoLower) ||
				   cedulaOriginal.includes(termino) ||
				   cedulaLimpia.includes(terminoLimpio) ||
				   visitante.apartamento.toLowerCase().includes(terminoLower) ||
				   visitante.autorizadoPor.toLowerCase().includes(terminoLower) ||
				   (visitante.vehiculo && (
				   		visitante.vehiculo.placa.toLowerCase().includes(terminoLower) ||
				   		visitante.vehiculo.tipo.toLowerCase().includes(terminoLower) ||
				   		visitante.vehiculo.color.toLowerCase().includes(terminoLower) ||
				   		(visitante.vehiculo.parqueadero && visitante.vehiculo.parqueadero.toLowerCase().includes(terminoLower))
				   ));
		});

		// Si encontramos resultados manuales, devolverlos
		if (resultadosManual.length > 0) {
			return resultadosManual;
		}

		// PRIORIDAD 4: Si no hay resultados manuales, usar Fuse.js como respaldo
		if (fuse) {
			const resultados = fuse.search(termino);
			return resultados.map(resultado => resultado.item);
		}

		// Si todo falla, devolver array vacío
		return [];
	}

	// Mostrar indicador de carga inicial
	function mostrarCarga() {
		if (sinVisitantes) {
			sinVisitantes.innerHTML = `
				<div class="text-center py-16">
					<div class="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mb-4"></div>
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Cargando visitantes...</h3>
					<p class="text-gray-500 dark:text-gray-400">Cargando base de datos...</p>
				</div>
			`;
		}
	}

	// Restaurar estado sin visitantes
	function restaurarEstadoVacio() {
		if (sinVisitantes) {
			sinVisitantes.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4">
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-2-2"/><path d="m16 11 2 2"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay visitantes activos</h3>
				<p class="text-gray-500 dark:text-gray-400 mb-6">Cuando se registre un visitante aparecerá aquí en tiempo real</p>
				<a href="/inicio" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
					 Registrar Visitante &nbsp;<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus">
										<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
										<circle cx="9" cy="7" r="4"/>
										<line x1="19" x2="19" y1="8" y2="14"/>
										<line x1="22" x2="16" y1="11" y2="11"/>
									</svg>
				</a>
			`;
		}
	}

	// Mostrar carga inicial
	mostrarCarga();

	// ===== FUNCIONES DE UTILIDAD =====
	
	// Función para capitalizar nombres (primera letra de cada palabra en mayúscula)
	function capitalizarNombre(nombre) {
		return nombre
			.toLowerCase()
			.split(' ')
			.map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
			.join(' ');
	}

	// Función para formatear cédula con puntos separadores
	function formatearCedula(cedula) {
		const numero = String(cedula).replace(/[^0-9]/g, '');
		// Agregar puntos cada 3 dígitos desde la derecha
		return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	// Función para formatear celular (formato colombiano)
	function formatearCelular(celular) {
		const numero = String(celular).replace(/[^0-9]/g, '');
		// Formato: 300 123 4567
		if (numero.length === 10) {
			return `${numero.slice(0, 3)} ${numero.slice(3, 6)} ${numero.slice(6)}`;
		}
		return numero;
	}

	// Función para formatear placa con guión (formato colombiano)
	function formatearPlaca(placa) {
		if (!placa) return '';
		const placaLimpia = String(placa).replace(/[^A-Z0-9]/g, '').toUpperCase();
		// Formato: ABC-123
		if (placaLimpia.length === 6) {
			return `${placaLimpia.slice(0, 3)}-${placaLimpia.slice(3)}`;
		}
		return placaLimpia;
	}

	// Función para formatear apartamento
	function formatearApartamento(apartamento) {
		return String(apartamento).toUpperCase();
	}

	// Función para calcular tiempo transcurrido en formato cronómetro
	function calcularTiempo(tiempoEntrada) {
		const ahora = new Date();
		let entrada;
		
		// Manejar diferentes formatos de fecha
		if (tiempoEntrada?.toDate) {
			// Timestamp de Firestore
			entrada = tiempoEntrada.toDate();
		} else if (typeof tiempoEntrada === 'string') {
			// String ISO
			entrada = new Date(tiempoEntrada);
		} else {
			// Fecha normal
			entrada = new Date(tiempoEntrada);
		}
		
		const diferencia = ahora - entrada;
		
		// Calcular horas, minutos y segundos
		const horas = Math.floor(diferencia / (1000 * 60 * 60));
		const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
		const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
		
		// Formato cronómetro: HH:MM:SS o MM:SS si es menos de una hora
		if (horas > 0) {
			return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
		}
		return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
	}

	// Función para formatear fecha/hora
	function formatearFecha(timestamp) {
		let fecha;
		
		if (timestamp?.toDate) {
			fecha = timestamp.toDate();
		} else if (typeof timestamp === 'string') {
			fecha = new Date(timestamp);
		} else {
			fecha = new Date(timestamp);
		}
		
		return fecha.toLocaleString('es-CO', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Función para resaltar texto de búsqueda en resultados
	function resaltarTexto(texto, termino) {
		if (!termino || termino.length < 2) {
			return texto;
		}
		
		// Limpiar término de búsqueda para cédulas y celulares (remover puntos, espacios y guiones)
		const terminoLimpio = termino.replace(/[.\s-]/g, '');
		
		// Si es una búsqueda de solo números (cédula o celular), resaltar coincidencias en ambos
		if (/^\d+$/.test(terminoLimpio)) {
			// Escapar caracteres especiales para regex
			const terminoEscapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const terminoLimpioEscapado = terminoLimpio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

			// Crear regex para buscar tanto el término original como el limpio (sin puntos)
			const regexOriginal = new RegExp(`(${terminoEscapado})`, 'gi');
			const regexLimpio = new RegExp(`(${terminoLimpioEscapado})`, 'gi');

			// Primero intentar con el término original
			let resultado = texto.replace(regexOriginal, '<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">$1</mark>');

			// Si no hay cambios, intentar con el término limpio (sin puntos/espacios)
			if (resultado === texto) {
				// Eliminar puntos y espacios del texto para buscar coincidencia sin formato
				const textoLimpio = texto.replace(/[.\s-]/g, '');
				resultado = textoLimpio.replace(regexLimpio, '<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">$1</mark>');
				// Volver a formatear el texto con los <mark> en la posición correcta
				if (resultado !== textoLimpio) {
					// Encontrar el índice de la coincidencia en el texto limpio
					const match = textoLimpio.match(regexLimpio);
					if (match && match.index !== undefined) {
						// Calcular la posición en el texto original
						const start = match.index;
						const end = start + match[0].length;
						// Buscar la posición correspondiente en el texto original
						let count = 0;
						let i = 0;
						let startOrig = -1;
						let endOrig = -1;
						for (; i < texto.length; i += 1) {
							if (/[0-9]/.test(texto[i])) {
								if (count === start) startOrig = i;
								if (count === end - 1) endOrig = i;
								count += 1;
							}
						}
						if (startOrig !== -1 && endOrig !== -1) {
							return `${texto.slice(0, startOrig)}<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">${texto.slice(startOrig, endOrig + 1)}</mark>${texto.slice(endOrig + 1)}`;
						}
					}
				}
			}
			return resultado;
		}

		// Para búsquedas normales de texto
		const terminoEscapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${terminoEscapado})`, 'gi');

		// Resaltar el texto con un span amarillo
		return texto.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">$1</mark>');
	}

	// Función para calcular el costo acumulado del vehículo
	function calcularCostoVehiculo(visitante) {
		if (!visitante.vehiculo) return '$0';
		
		const ahora = new Date();
		let entrada;
		
		// Manejar diferentes formatos de fecha
		if (visitante.tiempoEntrada?.toDate) {
			entrada = visitante.tiempoEntrada.toDate();
		} else if (typeof visitante.tiempoEntrada === 'string') {
			entrada = new Date(visitante.tiempoEntrada);
		} else {
			entrada = new Date(visitante.tiempoEntrada || visitante.fechaCreacion);
		}
		
		const diferenciaMilis = ahora - entrada;
		const minutos = Math.floor(diferenciaMilis / (1000 * 60));
		const costo = minutos * visitante.vehiculo.tarifa;
		
		return `$${costo.toLocaleString('es-CO')}`;
	}

	// Función para ejecutar la salida del visitante (llamada después de confirmación)
	async function ejecutarSalidaVisitante(visitanteId, nombre) {
		try {
			// Deshabilitar botón mientras se procesa
			const card = document.querySelector(`[data-visitante-id="${visitanteId}"]`);
			const button = card?.querySelector('.btn-dar-salida');
			if (button) {
				button.disabled = true;
				button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin inline mr-2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Procesando...';
			}
			
			// Verificar que la función existe
			if (!window.darSalidaVisitante) {
				throw new Error('Sistema no inicializado. Recarga la página e intenta nuevamente.');
			}
			
			// Actualizar en Firebase
			const resultado = await window.darSalidaVisitante(visitanteId);
			
			// Mostrar notificación de éxito con toast
			if (window.mostrarToast) {
				window.mostrarToast(
					`${nombre} ha salido exitosamente. Tiempo: ${resultado.tiempo || 'No disponible'}`, 
					'success', 
					5000
				);
			}
			
		} catch (error) {
			// Mostrar notificación de error con toast
			const mensajeError = error.message || 'Error desconocido al dar salida al visitante';
			if (window.mostrarToast) {
				window.mostrarToast(
					`Error: ${mensajeError}`, 
					'error', 
					6000
				);
			}
			
			// Rehabilitar botón en caso de error
			const card = document.querySelector(`[data-visitante-id="${visitanteId}"]`);
			if (card) {
				const button = card.querySelector('.btn-dar-salida');
				if (button) {
					button.disabled = false;
					button.innerHTML = `
						Dar Salida
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out ml-2">
							<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
						</svg>
					`;
				}
			}
		}
	}

	// Función para crear una card de visitante
	function crearCardVisitante(visitante) {
		const card = templateCard.content.cloneNode(true);
		
		// Obtener término de búsqueda actual para resaltado
		const termino = buscarVisitante?.value?.trim() || '';
		
		// Llenar datos con formato mejorado y resaltado
		card.querySelector('.visitante-nombre').innerHTML = resaltarTexto(capitalizarNombre(visitante.nombre), termino);
		card.querySelector('.visitante-cedula').innerHTML = `CC: ${resaltarTexto(formatearCedula(visitante.cedula), termino)}`;
		card.querySelector('.visitante-celular').innerHTML = resaltarTexto(formatearCelular(visitante.celular), termino);
		card.querySelector('.visitante-apartamento').innerHTML = `Apto: ${resaltarTexto(formatearApartamento(visitante.apartamento), termino)}`;
		card.querySelector('.visitante-autorizado').innerHTML = `Por: ${resaltarTexto(capitalizarNombre(visitante.autorizadoPor), termino)}`;
		card.querySelector('.visitante-tiempo').textContent = calcularTiempo(visitante.tiempoEntrada || visitante.fechaCreacion);
		card.querySelector('.visitante-hora-entrada').textContent = formatearFecha(visitante.tiempoEntrada || visitante.fechaCreacion);
		
		// Manejar información del vehículo
		if (visitante.vehiculo) {
			// Mostrar sección del vehículo
			const vehiculoInfo = card.querySelector('.vehiculo-info');
			const vehiculoCosto = card.querySelector('.vehiculo-costo');
			
			if (vehiculoInfo) {
				vehiculoInfo.classList.remove('hidden');
				card.querySelector('.vehiculo-tipo').innerHTML = resaltarTexto(visitante.vehiculo.tipo.toUpperCase(), termino);
				card.querySelector('.vehiculo-placa').innerHTML = resaltarTexto(formatearPlaca(visitante.vehiculo.placa), termino);
				card.querySelector('.vehiculo-color').innerHTML = resaltarTexto(visitante.vehiculo.color.toUpperCase(), termino);
				card.querySelector('.vehiculo-tarifa').textContent = `$${visitante.vehiculo.tarifa}/min`;
				
				// Mostrar parqueadero si está asignado
				const parqueaderoElement = card.querySelector('.vehiculo-parqueadero');
				const parqueaderoValorElement = card.querySelector('.vehiculo-parqueadero-valor');
				if (parqueaderoElement && parqueaderoValorElement && visitante.vehiculo.parqueadero) {
					parqueaderoValorElement.innerHTML = resaltarTexto(visitante.vehiculo.parqueadero, termino);
					parqueaderoElement.classList.remove('hidden');
					parqueaderoElement.classList.add('flex');
				} else if (parqueaderoElement) {
					parqueaderoElement.classList.add('hidden');
					parqueaderoElement.classList.remove('flex');
				}
			}
			
			if (vehiculoCosto) {
				vehiculoCosto.classList.remove('hidden');
				// El costo se actualizará con el cronómetro
				card.querySelector('.costo-valor').textContent = calcularCostoVehiculo(visitante);
			}
		}
		
		// Agregar ID para identificar la card
		card.querySelector('.visitante-card').dataset.visitanteId = visitante.id;
		
		// Evento para el botón de salida
		card.querySelector('.btn-dar-salida').addEventListener('click', async () => {
			// Mostrar modal de confirmación en lugar de ejecutar directamente
			if (window.mostrarConfirmSalida) {
				window.mostrarConfirmSalida(visitante.id, capitalizarNombre(visitante.nombre), ejecutarSalidaVisitante, visitante);
			} else {
				// Fallback si el modal no está disponible
				await ejecutarSalidaVisitante(visitante.id, capitalizarNombre(visitante.nombre));
			}
		});
		
		return card;
	}

	// ===== FUNCIONES PRINCIPALES =====

	// Función para actualizar contadores de filtros
	function actualizarContadoresFiltros() {
		const totalVisitantes = visitantesActivos.length;
		const conVehiculo = visitantesActivos.filter(v => v.vehiculo).length;
		const sinVehiculo = visitantesActivos.filter(v => !v.vehiculo).length;
		
		// Actualizar contadores en los botones
		const contadorTodos = document.getElementById('contador-todos');
		const contadorConVehiculo = document.getElementById('contador-con-vehiculo');
		const contadorSinVehiculo = document.getElementById('contador-sin-vehiculo');
		
		if (contadorTodos) contadorTodos.textContent = `(${totalVisitantes})`;
		if (contadorConVehiculo) contadorConVehiculo.textContent = `(${conVehiculo})`;
		if (contadorSinVehiculo) contadorSinVehiculo.textContent = `(${sinVehiculo})`;
	}

	// Función para renderizar las cards filtradas
	function renderizarCards() {
		// Actualizar contador principal
		if (contadorVisitantes) {
			contadorVisitantes.textContent = String(visitantesFiltrados.length);
		}
		
		// Actualizar contadores de filtros
		actualizarContadoresFiltros();
		
		if (isLoading) isLoading = false;
		
		if (visitantesFiltrados.length === 0) {
			if (sinVisitantes && gridVisitantes) {
				restaurarEstadoVacio();
				sinVisitantes.classList.remove('hidden');
				gridVisitantes.classList.add('hidden');
			}
		} else if (sinVisitantes && gridVisitantes) {
			sinVisitantes.classList.add('hidden');
			gridVisitantes.classList.remove('hidden');
			gridVisitantes.innerHTML = '';
			
			visitantesFiltrados.forEach(visitante => {
				const card = crearCardVisitante(visitante);
				gridVisitantes.appendChild(card);
			});
		}
	}

	// Función para aplicar filtros con búsqueda mejorada
	function aplicarFiltro() {
		let resultado = [...visitantesActivos];
		
		// Aplicar búsqueda primero si hay términos
		const termino = buscarVisitante?.value?.trim() || '';
		if (termino) {
			resultado = buscarVisitantes(termino);
		}
		
		// Luego aplicar filtro por tipo
		switch(filtroActual) {
			case 'con-vehiculo':
				visitantesFiltrados = resultado.filter(v => v.vehiculo);
				break;
			case 'sin-vehiculo':
				visitantesFiltrados = resultado.filter(v => !v.vehiculo);
				break;
			default:
				visitantesFiltrados = resultado;
		}
		renderizarCards();
	}

	// Event listeners para los filtros
	const filtroTodos = document.getElementById('filtro-todos');
	const filtroConVehiculo = document.getElementById('filtro-con-vehiculo');
	const filtroSinVehiculo = document.getElementById('filtro-sin-vehiculo');

	function actualizarEstadoFiltros() {
		// Remover clases active de todos los botones y aplicar estilo outline
		document.querySelectorAll('.filtro-btn').forEach(btn => {
			btn.classList.remove('active', 'bg-primary-500', 'text-white', 'shadow-md');
			
			// Determinar el color base del botón
			if (btn.id === 'filtro-todos') {
				btn.classList.add('border-primary-300', 'dark:border-primary-600', 'text-primary-600', 'dark:text-primary-400', 'bg-transparent');
				btn.classList.remove('border-primary-500');
			} else if (btn.id === 'filtro-con-vehiculo') {
				btn.classList.add('border-primary-300', 'dark:border-primary-600', 'text-primary-600', 'dark:text-primary-400', 'bg-transparent');
			} else if (btn.id === 'filtro-sin-vehiculo') {
				btn.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-600', 'dark:text-gray-400', 'bg-transparent');
			}
		});

		// Aplicar estilo activo al botón seleccionado
		const btnActivo = document.getElementById(`filtro-${filtroActual}`);
		if (btnActivo) {
			btnActivo.classList.add('active', 'shadow-md');
			
			if (filtroActual === 'todos') {
				btnActivo.classList.remove('border-primary-300', 'dark:border-primary-600', 'text-primary-600', 'dark:text-primary-400', 'bg-transparent');
				btnActivo.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
			} else if (filtroActual === 'con-vehiculo') {
				btnActivo.classList.remove('border-primary-300', 'dark:border-primary-600', 'text-primary-600', 'dark:text-primary-400', 'bg-transparent');
				btnActivo.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
			} else if (filtroActual === 'sin-vehiculo') {
				btnActivo.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-600', 'dark:text-gray-400', 'bg-transparent');
				btnActivo.classList.add('border-gray-500', 'bg-gray-500', 'text-white');
			}
		}
	}

	// Configurar event listeners para filtros
	if (filtroTodos) {
		filtroTodos.addEventListener('click', () => {
			filtroActual = 'todos';
			actualizarEstadoFiltros();
			aplicarFiltro();
		});
	}

	if (filtroConVehiculo) {
		filtroConVehiculo.addEventListener('click', () => {
			filtroActual = 'con-vehiculo';
			actualizarEstadoFiltros();
			aplicarFiltro();
		});
	}

	if (filtroSinVehiculo) {
		filtroSinVehiculo.addEventListener('click', () => {
			filtroActual = 'sin-vehiculo';
			actualizarEstadoFiltros();
			aplicarFiltro();
		});
	}

	// Función principal de renderizado
	function renderizarVisitantes() {
		aplicarFiltro();
	}

	// Función para actualizar tiempos cada segundo (cronómetro en tiempo real)
	function actualizarTiempos() {
		visitantesActivos.forEach(visitante => {
			const card = document.querySelector(`[data-visitante-id="${visitante.id}"]`);
			if (card) {
				const tiempoElement = card.querySelector('.visitante-tiempo');
				if (tiempoElement) {
					tiempoElement.textContent = calcularTiempo(visitante.tiempoEntrada || visitante.fechaCreacion);
				}

				// Actualizar costo del vehículo si tiene vehículo
				if (visitante.vehiculo) {
					const costoElement = card.querySelector('.costo-valor');
					if (costoElement) {
						costoElement.textContent = calcularCostoVehiculo(visitante);
					}
				}
			}
		});
	}

	// Event listener para el botón de imprimir parqueadero
	const btnImprimirParqueadero = document.getElementById('btn-imprimir-parqueadero');
	if (btnImprimirParqueadero) {
		btnImprimirParqueadero.addEventListener('click', () => {
			// Filtrar solo visitantes con vehículo
			const visitantesConVehiculo = visitantesActivos.filter(visitante => visitante.vehiculo);
			
			if (visitantesConVehiculo.length === 0) {
				if (window.mostrarToast) {
					window.mostrarToast('No hay vehículos activos para imprimir', 'warning');
				}
				return;
			}

			// Crear contenido HTML para imprimir
			const fechaActual = new Date().toLocaleString('es-CO', {
				day: '2-digit',
				month: '2-digit', 
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});

			let contenidoHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Verificación de Parqueadero - ${fechaActual}</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#000;background:white}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:15px}.fecha{font-size:14px;color:#666;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #333;padding:8px;text-align:left;font-size:12px}th{background-color:#f5f5f5;font-weight:bold}.verificado{width:60px;text-align:center}.footer{margin-top:30px;text-align:center;font-size:11px;color:#666}@media print{body{margin:0}.no-print{display:none}}</style></head><body><div class="header"><h1>VERIFICACIÓN DE PARQUEADERO</h1><div class="fecha">Generado: ${fechaActual}</div><div class="fecha">Total de vehículos: ${visitantesConVehiculo.length}</div></div><table><thead><tr><th>Placa</th><th>Propietario</th><th>Tipo</th><th>Color</th><th>Hora Entrada</th><th>Tiempo</th><th class="verificado">✓</th></tr></thead><tbody>`;

			// Agregar cada vehículo a la tabla
			visitantesConVehiculo.forEach(visitante => {
				const tiempo = calcularTiempo(visitante.tiempoEntrada || visitante.fechaCreacion);
				const horaEntrada = formatearFecha(visitante.tiempoEntrada || visitante.fechaCreacion);
				
				contenidoHTML += `<tr><td><strong>${formatearPlaca(visitante.vehiculo.placa) || 'N/A'}</strong></td><td>${capitalizarNombre(visitante.nombre)}</td><td>${visitante.vehiculo.tipo || 'N/A'}</td><td>${(visitante.vehiculo.color || 'N/A').toUpperCase()}</td><td>${horaEntrada}</td><td>${tiempo}</td><td class="verificado"></td></tr>`;
			});

			contenidoHTML += `</tbody></table><div class="footer"><p>Documento generado automáticamente para verificación física del parqueadero</p><p>Marque la columna ✓ al verificar cada vehículo físicamente</p></div></body></html>`;

			// Crear ventana emergente para imprimir
			const ventanaImpresion = window.open('', '_blank');
			ventanaImpresion.document.write(contenidoHTML);
			ventanaImpresion.document.close();
			
			// Esperar a que cargue y luego imprimir automáticamente
			ventanaImpresion.onload = function ventanaImpresionOnload() {
				ventanaImpresion.print();
				setTimeout(() => {
					ventanaImpresion.close();
				}, 1000);
			};
		});
	}

	// Conectar con Firebase para obtener visitantes en tiempo real con Fuse.js
	if (window.escucharVisitantesActivos) {
		unsubscribe = window.escucharVisitantesActivos((visitantes) => {
			visitantesActivos = visitantes;
			
			// Inicializar Fuse.js con los nuevos datos
			inicializarFuseActivos();
			
			renderizarVisitantes();
		});
	} else {
		// Si Firebase no está listo, reintentamos cada 100ms hasta un máximo de 3 segundos
		let intentos = 0;
		const maxIntentos = 30; // 3 segundos / 100ms
		
		const esperarFirebase = setInterval(() => {
			if (window.escucharVisitantesActivos || intentos >= maxIntentos) {
				clearInterval(esperarFirebase);
				
				if (window.escucharVisitantesActivos) {
					unsubscribe = window.escucharVisitantesActivos((visitantes) => {
						visitantesActivos = visitantes;
						renderizarVisitantes();
					});
				} else if (sinVisitantes) {
					// Si después de 3 segundos no hay Firebase, mostrar error
					sinVisitantes.innerHTML = `
						<div class="text-center py-16">
							<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi-off mx-auto h-24 w-24 text-red-400 mb-4">
								<line x1="1" x2="8.5" y1="1" y2="8.5"/><path d="M16.5 10.5c.5-.5 1.2-.5 1.7 0l.6.6c.5.5.5 1.2 0 1.7l-4 4-4-4c-.5-.5-.5-1.2 0-1.7l.6-.6c.5-.5 1.2-.5 1.7 0L12 12l.5-.5z"/><path d="M8.5 8.5A10 10 0 0 1 12 7a10 10 0 0 1 10 10"/><path d="M5 11a7 7 0 0 1 7-7"/>
							</svg>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Error de conexión</h3>
							<p class="text-gray-500 dark:text-gray-400 mb-6">No se pudo conectar con la base de datos</p>
							<button onclick="location.reload()" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw mr-2">
									<path d="m3 12 6-6 6 6"/><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 7.12 3"/>
								</svg>
								Reintentar
							</button>
						</div>
					`;
				}
			}
			intentos += 1;
		}, 100);
	}

	// Event listener para búsqueda en tiempo real
	if (buscarVisitante) {
		let timeoutId = null;
		
		buscarVisitante.addEventListener('input', () => {
			// Debounce para evitar búsquedas excesivas
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				aplicarFiltro();
			}, 150);
		});

		// Búsqueda inmediata al presionar Enter
		buscarVisitante.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				clearTimeout(timeoutId);
				aplicarFiltro();
			}
		});
	}

	// Timeout de seguridad: si después de 1 segundo no hay datos, mostrar estado vacío
	setTimeout(() => {
		if (isLoading && visitantesActivos.length === 0) {
			renderizarVisitantes();
		}
	}, 1000);

	// Actualizar cronómetros cada segundo para tiempo real
	intervalCronometro = setInterval(actualizarTiempos, 1000);

	// Cleanup cuando se cierre la página
	window.addEventListener('beforeunload', () => {
		if (unsubscribe) unsubscribe();
		if (intervalCronometro) clearInterval(intervalCronometro);
	});

	// ===== LÓGICA DEL MODAL =====
	const btnAgregar = document.getElementById('btn-agregar-visitante');
	const modal = document.getElementById('modal-visitante');
	const cerrar = document.getElementById('cerrar-modal-visitante');

	function abrirModal() {
		modal.classList.remove('opacity-0', 'pointer-events-none');
		modal.classList.add('opacity-100');
		modal.querySelector('div').classList.remove('scale-95');
		modal.querySelector('div').classList.add('scale-100');
	}
	
	function cerrarModal() {
		modal.classList.add('opacity-0', 'pointer-events-none');
		modal.classList.remove('opacity-100');
		modal.querySelector('div').classList.add('scale-95');
		modal.querySelector('div').classList.remove('scale-100');
	}
	
	if (btnAgregar && modal && cerrar) {
		btnAgregar.addEventListener('click', abrirModal);
		cerrar.addEventListener('click', cerrarModal);
		
		// Cerrar con fondo
		modal.addEventListener('click', (e) => {
			if (e.target === modal) cerrarModal();
		});
		
		// Cerrar con Escape
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !modal.classList.contains('opacity-0')) cerrarModal();
		});
	}

	// Escuchar evento de registro exitoso para cerrar el modal suavemente
	window.addEventListener('visitante-registrado-exito', () => {
		// Animación de cierre suave
		modal.classList.add('opacity-0');
		modal.querySelector('div').classList.add('scale-95');
		setTimeout(() => {
			modal.classList.add('pointer-events-none');
			modal.classList.remove('opacity-100');
		}, 300);
	});
});
