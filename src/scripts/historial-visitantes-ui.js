	// @ts-nocheck
	// Configuración de Firebase
	import { db } from '../lib/firebase.ts';
	// Script del cliente para manejar visitantes activos desde Firebase
	import './visitantes-activos';

	// Script del cliente para manejar historial de visitantes con CRUD

	document.addEventListener('DOMContentLoaded', () => {
		// Elementos del DOM
		const sinHistorial = document.getElementById('sin-historial');
		const tablaHistorial = document.getElementById('tabla-historial');
		const tbodyHistorial = document.getElementById('tbody-historial');
		const totalRegistros = document.getElementById('total-registros');
		const promedioPermanen = document.getElementById('promedio-permanencia');
		const tableSearch = document.getElementById('table-search');
		const datepickerHistorial = document.getElementById('datepicker-historial');
		const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
		
		// Modal elementos
		const modalVisitante = document.getElementById('modal-visitante');
		const modalEliminar = document.getElementById('modal-eliminar');
		const formVisitante = document.getElementById('form-visitante');
		const modalTitulo = document.getElementById('modal-titulo');
		
		// Variables de estado
		let historialVisitantes = [];
		let historialFiltrado = [];
		let visitanteEditando = null;
		let unsubscribe = null;
		let paginaActual = 1;
		const itemsPorPagina = 10;
		let filtroTipoActual = 'todos'; // Filtro por tipo de visitante
		let fechaFiltroActual = null; // Filtro por fecha

		// Variables para Fuse.js (búsqueda avanzada)
		let fuse = null;
		let fuseInitialized = false;

		// Configuración de Fuse.js para búsqueda inteligente
		const fuseOptions = {
			keys: [
				{ name: 'nombre', weight: 0.3 },
				{ name: 'cedula', weight: 0.25 },
				{ name: 'celular', weight: 0.22 }, // <--- AGREGADO
				{ name: 'apartamento', weight: 0.2 },
				{ name: 'autorizadoPor', weight: 0.15 },
				{ name: 'vehiculo.placa', weight: 0.1 }
			],
			threshold: 0.3, // 0 = coincidencia exacta, 1 = coincidencia cualquiera
			includeScore: true,
			minMatchCharLength: 2,
			ignoreLocation: true,
			findAllMatches: true
		};

		// Elementos del dropdown de filtros
		const btnFiltrar = document.getElementById('btn-filtrar');
		const dropdownFiltros = document.getElementById('dropdown-filtros');
		const filtroContador = document.getElementById('filtro-contador');

		// Función para actualizar el contador del botón de filtrar
		function actualizarContadorBotonFiltrar() {
			let cantidad = 0;
			let texto = '';
			
			switch(filtroTipoActual) {
				case 'con-vehiculo':
					cantidad = historialVisitantes.filter(v => v.vehiculo).length;
					texto = cantidad.toString();
					break;
				case 'sin-vehiculo':
					cantidad = historialVisitantes.filter(v => !v.vehiculo).length;
					texto = cantidad.toString();
					break;
				default:
					cantidad = historialVisitantes.length;
					texto = cantidad.toString();
			}
			
			if (filtroTipoActual !== 'todos') {
				filtroContador.textContent = texto;
				filtroContador.classList.remove('hidden');
			} else {
				filtroContador.classList.add('hidden');
			}
		}

		// Función para actualizar contadores de filtros en el historial
		function actualizarContadoresFiltrosHistorial() {
			const totalVisitantes = historialVisitantes.length;
			const conVehiculo = historialVisitantes.filter(v => v.vehiculo).length;
			const sinVehiculo = historialVisitantes.filter(v => !v.vehiculo).length;
			
			const contadorTodos = document.getElementById('contador-historial-todos');
			const contadorConVehiculo = document.getElementById('contador-historial-con-vehiculo');
			const contadorSinVehiculo = document.getElementById('contador-historial-sin-vehiculo');
			
			if (contadorTodos) contadorTodos.textContent = `(${totalVisitantes})`;
			if (contadorConVehiculo) contadorConVehiculo.textContent = `(${conVehiculo})`;
			if (contadorSinVehiculo) contadorSinVehiculo.textContent = `(${sinVehiculo})`;
		}

		// Función para aplicar filtro por tipo de visitante con Fuse.js
		function aplicarFiltroHistorial() {
			let resultado = [...historialVisitantes];
			
			// Aplicar filtro por tipo
			switch(filtroTipoActual) {
				case 'con-vehiculo':
					resultado = resultado.filter(v => v.vehiculo);
					break;
				case 'sin-vehiculo':
					resultado = resultado.filter(v => !v.vehiculo);
					break;
				default:
					// 'todos' - no filtrar
					break;
			}
			
			// Aplicar filtro por fecha si existe
			if (fechaFiltroActual) {
				resultado = resultado.filter(visitante => {
					const fechaCampo = visitante.tiempoEntrada || visitante.tiempoSalida;
					if (!fechaCampo) return false;
					let fechaVisitante;
					if (fechaCampo?.toDate) {
						fechaVisitante = fechaCampo.toDate();
					} else {
						fechaVisitante = new Date(fechaCampo);
					}
					const getFechaLocalStr = fecha => {
						const d = new Date(fecha);
						return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
					};
					const fechaLocalVisitante = getFechaLocalStr(fechaVisitante);
					return fechaLocalVisitante === fechaFiltroActual;
				});
			}
			
			// Aplicar búsqueda con Fuse.js (mejorada)
			const termino = tableSearch?.value?.trim() || '';
			if (termino) {
				// Actualizar Fuse con los datos filtrados por tipo y fecha
				if (resultado.length !== historialVisitantes.length && fuse) {
					// Crear una instancia temporal de Fuse para los datos filtrados
					try {
						const Fuse = fuse.constructor;
						const fuseTemp = new Fuse(resultado, fuseOptions);
						const resultadoBusqueda = buscarConFuseTemp(fuseTemp, termino, resultado);
						resultado = resultadoBusqueda;
					} catch (error) {
						// Fallback a búsqueda simple en datos filtrados
						const terminoLower = termino.toLowerCase();
						resultado = resultado.filter(visitante =>
							visitante.nombre.toLowerCase().includes(terminoLower) ||
							visitante.cedula.toString().includes(termino) ||
							visitante.celular?.toString().includes(termino) || // <--- AGREGADO
							visitante.apartamento.toLowerCase().includes(terminoLower) ||
							visitante.autorizadoPor.toLowerCase().includes(terminoLower) ||
							(visitante.vehiculo && visitante.vehiculo.placa.toLowerCase().includes(terminoLower))
						);
					}
				} else {
					// Usar búsqueda global con Fuse.js
					const resultadosBusqueda = buscarConFuse(termino);
					// Filtrar los resultados de Fuse.js por tipo y fecha
					resultado = resultadosBusqueda.filter(visitante => {
						// Verificar filtro por tipo
						let pasaTipo = true;					switch(filtroTipoActual) {
						case 'con-vehiculo':
							pasaTipo = !!visitante.vehiculo;
							break;
						case 'sin-vehiculo':
							pasaTipo = !visitante.vehiculo;
							break;
						default:
							pasaTipo = true;
							break;
					}
						
						// Verificar filtro por fecha
						let pasaFecha = true;
						if (fechaFiltroActual) {
							const fechaCampo = visitante.tiempoEntrada || visitante.tiempoSalida;
							if (fechaCampo) {
								let fechaVisitante;
								if (fechaCampo?.toDate) {
									fechaVisitante = fechaCampo.toDate();
								} else {
									fechaVisitante = new Date(fechaCampo);
								}
								const fechaLocalVisitante = getFechaLocalStr(fechaVisitante);
								pasaFecha = fechaLocalVisitante === fechaFiltroActual;
							} else {
								pasaFecha = false;
							}
						}
						
						return pasaTipo && pasaFecha;
					});
				}
			}
			
			historialFiltrado = resultado;
			paginaActual = 1; // Resetear paginación
			renderizarTabla();
			
			// Actualizar contador del botón de filtrar
			actualizarContadorBotonFiltrar();
			
			// Mostrar/ocultar botón de limpiar filtros (solo para filtros de fecha/tipo, no búsqueda)
			if (fechaFiltroActual || filtroTipoActual !== 'todos') {
				btnLimpiarFiltros?.classList.remove('hidden');
			} else {
				btnLimpiarFiltros?.classList.add('hidden');
			}
		}

		// Función auxiliar para búsqueda con Fuse temporal
		function buscarConFuseTemp(fuseInstance, termino, datos) {
			if (!termino || termino.length < 2) {
				return datos;
			}

			// Limpiar término de búsqueda para cédulas (remover puntos y espacios)
			const terminoLimpio = termino.replace(/[.\s-]/g, '');
			
			// PRIORIDAD 1: Si es una búsqueda de solo números (cédula), hacer búsqueda directa
			if (/^\d+$/.test(terminoLimpio)) {
				return datos.filter(visitante => {
					const cedulaLimpia = visitante.cedula.toString().replace(/[.\s-]/g, '');
					const cedulaOriginal = visitante.cedula.toString();
					
					// Buscar en cédula sin formato Y con formato
					return cedulaLimpia.includes(terminoLimpio) || 
						   cedulaOriginal.includes(termino) ||
						   cedulaLimpia === terminoLimpio ||
						   cedulaOriginal === termino;
				});
			}

			// PRIORIDAD 2: Si es una placa (3 letras + 3 números), buscar por placa
			if (/^[A-Z]{3}\d{3}$/.test(termino.toUpperCase().replace(/[-\s]/g, ''))) {
				const placaLimpia = termino.toUpperCase().replace(/[-\s]/g, '');
				return datos.filter(visitante =>
					visitante.vehiculo && (
						visitante.vehiculo.placa.toUpperCase().replace(/[-\s]/g, '').includes(placaLimpia) ||
						visitante.vehiculo.placa.toUpperCase().includes(termino.toUpperCase())
					)
				);
			}

			// PRIORIDAD 3: Para búsquedas de texto general, hacer búsqueda manual primero
			const terminoLower = termino.toLowerCase();
			const resultadosManual = datos.filter(visitante => {
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
					   		visitante.vehiculo.color.toLowerCase().includes(terminoLower)
					   ));
			});

			// Si encontramos resultados manuales, devolverlos
			if (resultadosManual.length > 0) {
				return resultadosManual;
			}

			// PRIORIDAD 4: Si no hay resultados manuales, usar Fuse.js como respaldo
			const resultados = fuseInstance.search(termino);
			return resultados.map(resultado => resultado.item);
		}

		// Event listeners para el dropdown de filtros
		if (btnFiltrar && dropdownFiltros) {
			// Toggle dropdown
			btnFiltrar.addEventListener('click', (e) => {
				e.stopPropagation();
				dropdownFiltros.classList.toggle('hidden');
			});

			// Cerrar dropdown al hacer click fuera
			document.addEventListener('click', (e) => {
				if (!dropdownFiltros.contains(e.target) && !btnFiltrar.contains(e.target)) {
					dropdownFiltros.classList.add('hidden');
				}
			});

			// Manejar cambios en los radio buttons
			const radioButtons = dropdownFiltros.querySelectorAll('input[name="filtro-tipo"]');
			radioButtons.forEach(radio => {
				radio.addEventListener('change', (e) => {
					filtroTipoActual = e.target.value;
					aplicarFiltroHistorial();
					dropdownFiltros.classList.add('hidden');
				});
			});
		}

		// Inicializar Flowbite Datepicker
		if (datepickerHistorial) {
			// Configuración del datepicker
			const datepickerConfig = {
				format: 'dd/mm/yyyy',
				maxDate: new Date(),
				autohide: true,
				todayBtn: true,
				clearBtn: true,
				language: 'es',
				title: 'Seleccionar fecha',
				todayBtnText: 'Hoy'
			};

			// Importar y crear instancia del datepicker
			import('flowbite-datepicker').then(({ Datepicker }) => {
				const datepicker = new Datepicker(datepickerHistorial, datepickerConfig);

				// Event listener para cambios en el datepicker
				datepickerHistorial.addEventListener('changeDate', (e) => {
					if (e.detail.date) {
						const fecha = new Date(e.detail.date);
						const [fechaISO] = fecha.toISOString().split('T');
						fechaFiltroActual = fechaISO;
					} else {
						fechaFiltroActual = null;
					}
					aplicarFiltroHistorial();
				});

				// Event listener específico para el botón "Today"
				setTimeout(() => {
					const todayBtn = document.querySelector('.datepicker .today-btn, .datepicker [data-date="today"]');
					if (todayBtn) {
						todayBtn.addEventListener('click', () => {
							const hoy = new Date();
							const [fechaHoy] = hoy.toISOString().split('T');
							fechaFiltroActual = fechaHoy;
							aplicarFiltroHistorial();
						});
					}
				}, 500);

				// Event listener para el botón clear
				setTimeout(() => {
					const clearBtn = document.querySelector('.datepicker .clear-btn, .datepicker [data-date="clear"]');
					if (clearBtn) {
						clearBtn.addEventListener('click', () => {
							fechaFiltroActual = null;
							aplicarFiltroHistorial();
						});
					}
				}, 500);

			}).catch(() => {
				// Error silencioso - el datepicker seguirá funcionando sin funcionalidades avanzadas
			});
		}

		// Función para inicializar Fuse.js
		async function inicializarFuse() {
			if (!fuseInitialized && historialVisitantes.length > 0) {
				try {
					const Fuse = (await import('fuse.js')).default;
					fuse = new Fuse(historialVisitantes, fuseOptions);
					fuseInitialized = true;
					// console.log('🔍 Fuse.js inicializado con', historialVisitantes.length, 'visitantes');
				} catch (error) {
					// console.error('Error al inicializar Fuse.js:', error);
					// Fallback a búsqueda simple si falla Fuse.js
					fuse = null;
				}
			}
		}

		// Función de búsqueda mejorada con Fuse.js
		function buscarConFuse(termino) {
			if (!termino || termino.length < 2) {
				return [...historialVisitantes];
			}

			// Limpiar término de búsqueda para cédulas, celulares, apartamento y placa (remover puntos, espacios y guiones)
			const terminoLimpio = termino.replace(/[.\s-]/g, '');
			// PRIORIDAD 1: Si es una búsqueda de solo números (cédula, celular, apartamento o placa), hacer búsqueda directa
			if (/^\d+$/.test(terminoLimpio)) {
				return historialVisitantes.filter(visitante => {
					const cedulaLimpia = visitante.cedula?.toString().replace(/[.\s-]/g, '') || '';
					const cedulaOriginal = visitante.cedula?.toString() || '';
					const celularLimpio = visitante.celular?.toString().replace(/[.\s-]/g, '') || '';
					const celularOriginal = visitante.celular?.toString() || '';
					const aptoLimpio = visitante.apartamento?.toString().replace(/[.\s-]/g, '') || '';
					const aptoOriginal = visitante.apartamento?.toString() || '';
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
				return historialVisitantes.filter(visitante =>
					visitante.vehiculo && (
						visitante.vehiculo.placa.toUpperCase().replace(/[-\s]/g, '').includes(placaLimpia) ||
						visitante.vehiculo.placa.toUpperCase().includes(termino.toUpperCase())
					)
				);
			}

			// PRIORIDAD 3: Para búsquedas de texto general, hacer búsqueda manual primero
			const terminoLower = termino.toLowerCase();
			const resultadosManual = historialVisitantes.filter(visitante => {
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
					   		visitante.vehiculo.color.toLowerCase().includes(terminoLower)
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

		// Event listener para búsqueda en tiempo real mejorada
		if (tableSearch) {
			let timeoutId = null;
			
			tableSearch.addEventListener('input', () => {
				// Debounce para evitar búsquedas excesivas
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					aplicarFiltroHistorial();
				}, 150); // Esperar 150ms después del último keystroke
			});

			// Búsqueda inmediata al presionar Enter
			tableSearch.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					clearTimeout(timeoutId);
					aplicarFiltroHistorial();
				}
			});
		}

		// Event listener para botón limpiar filtros
		if (btnLimpiarFiltros) {
			btnLimpiarFiltros.addEventListener('click', () => {
				// Limpiar filtros
				fechaFiltroActual = null;
				filtroTipoActual = 'todos';
				
				// Resetear elementos del DOM
				if (datepickerHistorial) {
					datepickerHistorial.value = '';
				}
				if (tableSearch) {
					tableSearch.value = '';
				}
				
				// Marcar radio button "todos"
				const radioTodos = dropdownFiltros?.querySelector('input[value="todos"]');
				if (radioTodos) {
					radioTodos.checked = true;
				}
				
				// Aplicar filtros
				aplicarFiltroHistorial();
			});
		}

		// Función para capitalizar nombres
		function capitalizarNombre(nombre) {
			return nombre
				.toLowerCase()
				.split(' ')
				.map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
				.join(' ');
		}

		// Función para formatear cédula
		function formatearCedula(cedula) {
			const numero = String(cedula).replace(/[^0-9]/g, '');
			return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
		}

		// Función para formatear celular
		function formatearCelular(celular) {
			const numero = String(celular).replace(/[^0-9]/g, '');
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

		// Función para calcular duración de permanencia
		function calcularDuracion(tiempoEntrada, tiempoSalida) {
			let entrada;
			let salida;
			
			if (tiempoEntrada?.toDate) {
				entrada = tiempoEntrada.toDate();
			} else {
				entrada = new Date(tiempoEntrada);
			}
			
			if (tiempoSalida?.toDate) {
				salida = tiempoSalida.toDate();
			} else {
				salida = new Date(tiempoSalida);
			}
			
			const diferencia = salida - entrada;
			const horas = Math.floor(diferencia / (1000 * 60 * 60));
			const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
			
			if (horas > 0) {
				return `${horas}h ${minutos}m`;
			}
			return `${minutos}m`;
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
							let count = 0, i = 0, startOrig = -1, endOrig = -1;
							for (; i < texto.length; i++) {
								if (/[0-9]/.test(texto[i])) {
									if (count === start) startOrig = i;
									if (count === end - 1) endOrig = i;
									count++;
								}
							}
							if (startOrig !== -1 && endOrig !== -1) {
								return (
									texto.slice(0, startOrig) +
									'<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 px-1 rounded">' +
									texto.slice(startOrig, endOrig + 1) +
									'</mark>' +
									texto.slice(endOrig + 1)
								);
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

		// Función para calcular el costo total del vehículo
		function calcularCostoTotal(visitante) {
			if (!visitante.vehiculo || !visitante.vehiculo.tarifa) return 0;
			
			// Si el visitante ya tiene un costo calculado (costoVehiculo), usarlo
			if (visitante.costoVehiculo !== undefined) {
				return visitante.costoVehiculo;
			}
			
			// Si tiene información del vehículo final con costo total, usarla
			if (visitante.vehiculoFinal && visitante.vehiculoFinal.costoTotal !== undefined) {
				return visitante.vehiculoFinal.costoTotal;
			}
			
			// Calcular basado en el tiempo de estancia
			let entrada;
			let salida;
			
			if (visitante.tiempoEntrada?.toDate) {
				entrada = visitante.tiempoEntrada.toDate();
			} else {
				entrada = new Date(visitante.tiempoEntrada || visitante.fechaCreacion);
			}
			
			if (visitante.tiempoSalida?.toDate) {
				salida = visitante.tiempoSalida.toDate();
			} else {
				salida = new Date(visitante.tiempoSalida || visitante.fechaSalida);
			}
			
			const diferencia = salida - entrada;
			const minutos = Math.floor(diferencia / (1000 * 60)); // Convertir a minutos
			
			return minutos * visitante.vehiculo.tarifa;
		}

		// Función para crear una fila de la tabla
		function crearFilaTabla(visitante) {
			// Calcular costo total del vehículo
			const costoTotal = visitante.vehiculo ? calcularCostoTotal(visitante) : 0;
			
			// Obtener término de búsqueda actual para resaltado
			const termino = tableSearch?.value?.trim() || '';
			
			return `
				<tr class="border-b dark:border-gray-700">
					<td class="px-4 py-3 font-medium text-gray-900 dark:text-white w-1/5">
						<div class="flex items-center">
							<div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-5 h-5 text-gray-600"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
							</div>
							<div class="min-w-0">
								<div class="text-base font-semibold truncate">
									<button 
										onclick="verVisitante('${visitante.id}')" 
										class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 hover:underline cursor-pointer transition-colors duration-200 text-left truncate w-full"
										title="Ver detalles del visitante"
									>
										${resaltarTexto(capitalizarNombre(visitante.nombre), termino)}
									</button>
								</div>
								<div class="font-normal text-gray-500 truncate">CC: ${resaltarTexto(formatearCedula(visitante.cedula), termino)}</div>
							</div>
						</div>
					</td>
					<td class="px-4 py-3 w-1/8">
						<span class="truncate block">${resaltarTexto(formatearCelular(visitante.celular), termino)}</span>
					</td>
					<td class="px-4 py-3 w-1/8">
						<div class="text-base truncate">Apto: ${resaltarTexto(visitante.apartamento.toUpperCase(), termino)}</div>
						<div class="text-sm text-gray-500 truncate">Por: ${resaltarTexto(capitalizarNombre(visitante.autorizadoPor), termino)}</div>
					</td>
					<td class="px-4 py-3 w-1/6">
						${visitante.vehiculo ? `
							<div class="flex items-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car w-4 h-4 text-blue-600 dark:text-blue-400 mr-1 flex-shrink-0"><path d="M8 19H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h6l2 4h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
								<div class="min-w-0">
									<div class="text-sm font-medium text-gray-900 dark:text-white truncate">${resaltarTexto(formatearPlaca(visitante.vehiculo.placa), termino)}</div>
									<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${resaltarTexto(visitante.vehiculo.tipo, termino)} • ${resaltarTexto(visitante.vehiculo.color, termino)}</div>
								</div>
							</div>
						` : `
							<span class="text-gray-400 dark:text-gray-500 text-sm">Sin vehículo</span>
						`}
					</td>
					<td class="px-4 py-3 w-1/8">
						${visitante.vehiculo ? `
							<span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded dark:bg-green-900 dark:text-green-300">
								$${costoTotal.toLocaleString('es-CO')}
							</span>
						` : `
							<span class="text-gray-400 dark:text-gray-500 text-sm">—</span>
						`}
					</td>
					<td class="px-4 py-3 w-1/8">
						<span class="text-sm truncate block">${formatearFecha(visitante.tiempoEntrada || visitante.fechaCreacion)}</span>
					</td>
					<td class="px-4 py-3 w-1/8">
						<span class="text-sm truncate block">${formatearFecha(visitante.tiempoSalida || visitante.fechaSalida)}</span>
					</td>
					<td class="px-4 py-3 w-1/12">
						<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300 inline-block">
							${calcularDuracion(visitante.tiempoEntrada || visitante.fechaCreacion, visitante.tiempoSalida || visitante.fechaSalida)}
						</span>
					</td>
					<td class="px-4 py-3 w-16">
						<div class="flex items-center justify-end">
							<button class="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none dark:text-gray-400 dark:hover:text-gray-100" onclick="mostrarMenuAcciones(event, '${visitante.id}')">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
							</button>
						</div>
					</td>
				</tr>
			`;
		}

		// Función para mostrar menú de acciones
		window.mostrarMenuAcciones = function(event, visitanteId) {
			event.stopPropagation();
			
			// Verificar si ya existe un menú abierto para este visitante
			const menuExistente = document.querySelector(`.menu-acciones[data-visitante-id="${visitanteId}"]`);
			if (menuExistente) {
				// Si ya está abierto, cerrarlo (toggle)
				menuExistente.remove();
				return;
			}
			
			// Remover cualquier otro menú abierto
			document.querySelectorAll('.menu-acciones').forEach(m => m.remove());
			
			// Crear menú contextual
			const menu = document.createElement('div');
			menu.className = 'absolute z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 dark:divide-gray-600';
			menu.setAttribute('data-visitante-id', visitanteId); // Para identificar el menú
			menu.innerHTML = `
				<ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
					<li>
						<button onclick="verVisitante('${visitanteId}')" class="block w-full text-left py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
							👁️ Ver detalles
						</button>
					</li>
					<li>
						<button onclick="editarVisitante('${visitanteId}')" class="block w-full text-left py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
							✏️ Editar
						</button>
					</li>
					<li>
						<button onclick="eliminarVisitante('${visitanteId}')" class="block w-full text-left py-2 px-4 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-red-500">
							🗑️ Eliminar
						</button>
					</li>
				</ul>
			`;
			
			menu.classList.add('menu-acciones');
			
			// Agregar el menú al DOM temporalmente para obtener sus dimensiones
			menu.style.visibility = 'hidden';
			document.body.appendChild(menu);
			
			// Obtener dimensiones del menú y del viewport
			const menuRect = menu.getBoundingClientRect();
			const buttonRect = event.target.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			
			// Calcular posición inteligente
			let top = buttonRect.bottom + 5; // 5px de margen
			const { left: initialLeft } = buttonRect;
			let left = initialLeft;
			
			// Ajustar si el menú se sale por la derecha
			if (left + menuRect.width > viewportWidth) {
				left = buttonRect.right - menuRect.width;
			}
			
			// Ajustar si el menú se sale por la izquierda
			if (left < 0) {
				left = 10; // Margen mínimo desde el borde izquierdo
			}
			
			// Ajustar si el menú se sale por abajo
			if (top + menuRect.height > viewportHeight) {
				top = buttonRect.top - menuRect.height - 5; // Mostrar arriba del botón
			}
			
			// Ajustar si el menú se sale por arriba
			if (top < 0) {
				top = 10; // Margen mínimo desde el borde superior
			}
			
			// Aplicar posición final
			menu.style.position = 'fixed';
			menu.style.top = `${top}px`;
			menu.style.left = `${left}px`;
			menu.style.visibility = 'visible';
			
			// Función para cerrar el menú
			function cerrarMenu() {
				menu.remove();
				document.removeEventListener('click', cerrarMenu);
				document.removeEventListener('keydown', manejarTeclaEscape);
			}
			
			// Función para manejar la tecla Escape
			function manejarTeclaEscape(keyEvent) {
				if (keyEvent.key === 'Escape') {
					cerrarMenu();
				}
			}
			
			// Event listeners para cerrar el menú
			setTimeout(() => {
				document.addEventListener('click', cerrarMenu);
				document.addEventListener('keydown', manejarTeclaEscape);
			}, 100);
		};

		// Función para ver detalles del visitante
		window.verVisitante = function(visitanteId) {
			const visitante = historialVisitantes.find(v => v.id === visitanteId);
			if (visitante) {
				modalTitulo.textContent = 'Detalles del Visitante';
				llenarFormulario(visitante, false); // false = solo ver
				deshabilitarFormulario(true);
				document.getElementById('guardar-cambios').style.display = 'none';
				mostrarModal(modalVisitante);
			}
		};

		// Función para editar visitante
		window.editarVisitante = function(visitanteId) {
			const visitante = historialVisitantes.find(v => v.id === visitanteId);
			if (visitante) {
				visitanteEditando = visitante;
				modalTitulo.textContent = 'Editar Visitante';
				llenarFormulario(visitante, true); // true = es edición
				deshabilitarFormulario(false);
				document.getElementById('guardar-cambios').style.display = 'inline-flex';
				mostrarModal(modalVisitante);
			}
		};

		// Función para eliminar visitante
		window.eliminarVisitante = function(visitanteId) {
			visitanteEditando = historialVisitantes.find(v => v.id === visitanteId);
			mostrarModal(modalEliminar);
		};

		// Función para llenar formulario
		function llenarFormulario(visitante, esEdicion = false) {
			document.getElementById('nombre').value = visitante.nombre;
			document.getElementById('cedula').value = visitante.cedula;
			document.getElementById('celular').value = visitante.celular;
			document.getElementById('apartamento').value = visitante.apartamento;
			document.getElementById('autorizadoPor').value = visitante.autorizadoPor;
			
			// Mostrar/ocultar sección de vehículo
			const seccionVehiculo = document.getElementById('seccion-vehiculo');
			const bannerVer = document.getElementById('banner-vehiculo-ver');
			const bannerEditar = document.getElementById('banner-vehiculo-editar');
			
			if (visitante.vehiculo) {
				seccionVehiculo.classList.remove('hidden');
				
				// Calcular el costo total
				const costoTotal = calcularCostoTotal(visitante);
				const costoFormateado = costoTotal ? `$${costoTotal.toLocaleString('es-CO')}` : '$0';
				
				if (esEdicion) {
					// Mostrar banner rojo para edición
					bannerVer.classList.add('hidden');
					bannerEditar.classList.remove('hidden');
					
					// Llenar campos del formulario de edición
					document.getElementById('vehiculo-placa').value = visitante.vehiculo.placa || '';
					document.getElementById('vehiculo-tipo').value = visitante.vehiculo.tipo || '';
					document.getElementById('vehiculo-color').value = visitante.vehiculo.color || '';
					document.getElementById('vehiculo-costo').value = costoFormateado;
				} else {
					// Mostrar banner azul para solo ver
					bannerEditar.classList.add('hidden');
					bannerVer.classList.remove('hidden');
					
					// Llenar elementos de solo lectura
					document.getElementById('vehiculo-placa-ver').textContent = formatearPlaca(visitante.vehiculo.placa) || '';
					document.getElementById('vehiculo-tipo-ver').textContent = visitante.vehiculo.tipo || '';
					document.getElementById('vehiculo-color-ver').textContent = visitante.vehiculo.color || '';
					document.getElementById('vehiculo-costo-ver').textContent = costoFormateado;
				}
			} else {
				seccionVehiculo.classList.add('hidden');
			}
		}

		// Función para habilitar/deshabilitar formulario
		function deshabilitarFormulario(deshabilitar) {
			// Solo deshabilitar campos básicos del visitante, no los del vehículo
			const camposBasicos = ['nombre', 'cedula', 'celular', 'apartamento', 'autorizadoPor'];
			camposBasicos.forEach(campoId => {
				const campo = document.getElementById(campoId);
				if (campo) {
					campo.disabled = deshabilitar;
				}
			});
		}

		// Variable para tracking del modal actual
		let modalActual = null;
		
		// Función para manejar la tecla Escape en modales
		const manejarEscapeModal = function(event) {
			if (event.key === 'Escape' && modalActual) {
				event.preventDefault();
				ocultarModal(modalActual);
			}
		};
		
		// Función para mostrar modal
		function mostrarModal(modal) {
			modal.classList.remove('hidden');
			modal.classList.add('flex', 'items-center', 'justify-center');
			modalActual = modal;
			
			// Agregar event listener para cerrar con Escape
			document.addEventListener('keydown', manejarEscapeModal);
		}

		// Función para ocultar modal
		function ocultarModal(modal) {
			modal.classList.add('hidden');
			modal.classList.remove('flex', 'items-center', 'justify-center');
			modalActual = null;
			
			// Remover event listener para cerrar con Escape
			document.removeEventListener('keydown', manejarEscapeModal);
		}

		// Función para filtrar visitantes
		function filtrarVisitantes(termino) {
			if (!termino.trim()) {
				historialFiltrado = [...historialVisitantes];
			} else {
				const terminoLower = termino.toLowerCase();
				historialFiltrado = historialVisitantes.filter(visitante => 
					visitante.nombre.toLowerCase().includes(terminoLower) ||
					visitante.cedula.includes(termino) ||
					visitante.celular.includes(termino) ||
					visitante.apartamento.toLowerCase().includes(terminoLower) ||
					visitante.autorizadoPor.toLowerCase().includes(terminoLower)
				);
			}
			paginaActual = 1;
			renderizarTabla();
		}

		// Función para calcular estadísticas
		function calcularEstadisticas() {
			if (historialVisitantes.length === 0) return;
			
			let totalMinutos = 0;
			historialVisitantes.forEach(visitante => {
				const entrada = visitante.tiempoEntrada?.toDate ? 
					visitante.tiempoEntrada.toDate() : 
					new Date(visitante.fechaCreacion);
				const salida = visitante.tiempoSalida?.toDate ? 
					visitante.tiempoSalida.toDate() : 
					new Date(visitante.fechaSalida);
				
				totalMinutos += (salida - entrada) / (1000 * 60);
			});
			
			const promedioMinutos = Math.floor(totalMinutos / historialVisitantes.length);
			const horas = Math.floor(promedioMinutos / 60);
			const minutos = promedioMinutos % 60;
			
			if (promedioPermanen) {
				promedioPermanen.textContent = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
			}
		}

		// Función para renderizar la tabla
		function renderizarTabla() {
			if (totalRegistros) {
				totalRegistros.textContent = String(historialFiltrado.length);
			}
			
			calcularEstadisticas();
			
			if (historialFiltrado.length === 0) {
				if (sinHistorial && tablaHistorial) {
					sinHistorial.classList.remove('hidden');
					tablaHistorial.style.display = 'none';
				}
			} else {
				if (sinHistorial && tablaHistorial && tbodyHistorial) {
					sinHistorial.classList.add('hidden');
					tablaHistorial.style.display = 'table';
					
					// Calcular paginación
					const inicio = (paginaActual - 1) * itemsPorPagina;
					const fin = inicio + itemsPorPagina;
					const visitantesPagina = historialFiltrado.slice(inicio, fin);
					
					// Limpiar tabla
					tbodyHistorial.innerHTML = '';
					
					// Agregar cada visitante
					visitantesPagina.forEach(visitante => {
						tbodyHistorial.innerHTML += crearFilaTabla(visitante);
					});
					
					actualizarPaginacion();
				}
			}
		}

		// Función para actualizar paginación
		function actualizarPaginacion() {
			const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina);
			const paginacion = document.getElementById('paginacion');
			
			if (totalPaginas > 1) {
				paginacion.classList.remove('hidden');
				
				const inicio = (paginaActual - 1) * itemsPorPagina + 1;
				const fin = Math.min(paginaActual * itemsPorPagina, historialFiltrado.length);
				
				document.getElementById('inicio-rango').textContent = inicio;
				document.getElementById('fin-rango').textContent = fin;
				document.getElementById('total-items').textContent = historialFiltrado.length;
				document.getElementById('numero-pagina').textContent = paginaActual;
				
				// Botones de navegación
				document.getElementById('btn-anterior').disabled = paginaActual === 1;
				document.getElementById('btn-siguiente').disabled = paginaActual === totalPaginas;
			} else {
				paginacion.classList.add('hidden');
			}
		}

		// Event listeners
		if (tableSearch) {
			tableSearch.addEventListener('input', (e) => {
				filtrarVisitantes(e.target.value);
			});
		}

		// Event listeners para modales
		document.getElementById('cerrar-modal').addEventListener('click', () => {
			ocultarModal(modalVisitante);
		});

		document.getElementById('cancelar-modal').addEventListener('click', () => {
			ocultarModal(modalVisitante);
		});

		document.getElementById('cerrar-modal-eliminar').addEventListener('click', () => {
			ocultarModal(modalEliminar);
		});

		document.getElementById('cancelar-eliminar').addEventListener('click', () => {
			ocultarModal(modalEliminar);
		});

		// Event listeners para modal de exportación
		const modalExportar = document.getElementById('modal-exportar');
		
		document.getElementById('btn-exportar').addEventListener('click', () => {
			if (historialFiltrado.length === 0) {
				if (window.mostrarAlert) {
					window.mostrarAlert('No hay datos para exportar', 'warning');
				}
				return;
			}
			mostrarModal(modalExportar);
		});

		document.getElementById('cerrar-modal-exportar').addEventListener('click', () => {
			ocultarModal(modalExportar);
		});

		// Funciones de exportación
		async function exportarPDF() {
			try {
				// Mostrar indicador de carga
				const btnPDF = document.getElementById('exportar-pdf');
				const textoOriginal = btnPDF.innerHTML;
				btnPDF.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin -ml-1 mr-3 h-5 w-5 text-white"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
					Generando PDF...
				`;
				btnPDF.disabled = true;

				// Importar jsPDF
				const { jsPDF } = await import('jspdf');
				
				// Crear documento PDF horizontal
				const doc = new jsPDF('landscape');
				const pageWidth = doc.internal.pageSize.width; // 297mm
				const pageHeight = doc.internal.pageSize.height; // 210mm
				const margin = 10;
				let yPosition = margin + 10;
				
				// TÍTULO PRINCIPAL - CENTRADO
				doc.setFontSize(18);
				doc.setFont('helvetica', 'bold');
				doc.setTextColor(0, 0, 0);
				doc.text('HISTORIAL DE VISITANTES - GESTCLOUD', pageWidth / 2, yPosition, { align: 'center' });
				yPosition += 15;
				
				// INFORMACIÓN DEL FILTRO
				doc.setFontSize(12);
				doc.setFont('helvetica', 'normal');
				doc.setTextColor(80, 80, 80);
				
				let textoFiltro = '';
				switch(filtroTipoActual) {
					case 'con-vehiculo':
						textoFiltro = `Filtro aplicado: Visitantes CON vehículo (${historialFiltrado.length} registros)`;
						break;
					case 'sin-vehiculo':
						textoFiltro = `Filtro aplicado: Visitantes SIN vehículo (${historialFiltrado.length} registros)`;
						break;
					default:
						textoFiltro = `Filtro aplicado: TODOS los visitantes (${historialFiltrado.length} registros)`;
				}
				
				doc.text(textoFiltro, pageWidth / 2, yPosition, { align: 'center' });
				yPosition += 8;
				
				// Fecha de generación
				const fechaGeneracion = new Date().toLocaleString('es-CO', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
				doc.setFontSize(10);
				doc.text(`Generado el: ${fechaGeneracion}`, pageWidth / 2, yPosition, { align: 'center' });
				yPosition += 20;
				
				// CONFIGURAR COLUMNAS SEGÚN EL FILTRO
				let tableHeaders = [];
				let colWidths = [];
				let incluirVehiculo = false;
				let incluirCosto = false;
				
				// Determinar qué columnas incluir
				if (filtroTipoActual === 'sin-vehiculo') {
					// Para visitantes SIN vehículo: NO mostrar columnas de vehículo ni costo
					tableHeaders = ['#', 'Nombre Completo', 'Cédula', 'Apto', 'Entrada', 'Salida', 'Tiempo', 'Autorizado por'];
					colWidths = [12, 50, 28, 15, 32, 32, 20, 45];
				} else if (filtroTipoActual === 'con-vehiculo') {
					// Para visitantes CON vehículo: mostrar todas las columnas
					incluirVehiculo = true;
					incluirCosto = true;
					tableHeaders = ['#', 'Nombre Completo', 'Cédula', 'Apto', 'Vehículo', 'Entrada', 'Salida', 'Tiempo', 'Costo', 'Autorizado por'];
					colWidths = [10, 40, 24, 12, 35, 28, 28, 18, 20, 35];
				} else {
					// Para TODOS: mostrar vehículo y costo solo si hay visitantes con vehículo
					if (historialFiltrado.some(v => v.vehiculo)) {
						incluirVehiculo = true;
						incluirCosto = true;
						tableHeaders = ['#', 'Nombre Completo', 'Cédula', 'Apto', 'Vehículo', 'Entrada', 'Salida', 'Tiempo', 'Costo', 'Autorizado por'];
						colWidths = [10, 40, 24, 12, 35, 28, 28, 18, 20, 35];
					} else {
						tableHeaders = ['#', 'Nombre Completo', 'Cédula', 'Apto', 'Entrada', 'Salida', 'Tiempo', 'Autorizado por'];
						colWidths = [12, 50, 28, 15, 32, 32, 20, 45];
					}
				}
				
				// Función para formatear fecha
				function formatearFechaPDF(timestamp) {
					let fecha;
					if (timestamp?.toDate) {
						fecha = timestamp.toDate();
					} else {
						fecha = new Date(timestamp);
					}
					return fecha.toLocaleString('es-CO', {
						day: '2-digit',
						month: '2-digit',
						year: '2-digit',
						hour: '2-digit',
						minute: '2-digit'
					});
				}
				
				// PREPARAR DATOS DE LA TABLA
				let totalCosto = 0;
				const tableData = historialFiltrado.map((visitante, index) => {
					const row = [];
					
					// Columnas básicas
					row.push(
						index + 1,
						capitalizarNombre(visitante.nombre),
						formatearCedula(visitante.cedula),
						visitante.apartamento.toUpperCase()
					);
					
					// Agregar vehículo si corresponde
					if (incluirVehiculo) {
						if (visitante.vehiculo) {
							row.push(`${formatearPlaca(visitante.vehiculo.placa)} - ${visitante.vehiculo.tipo} ${visitante.vehiculo.color}`);
						} else {
							row.push('Sin vehículo');
						}
					}
					
					// Tiempos
					row.push(
						formatearFechaPDF(visitante.tiempoEntrada || visitante.fechaCreacion),
						formatearFechaPDF(visitante.tiempoSalida || visitante.fechaSalida),
						calcularDuracion(visitante.tiempoEntrada || visitante.fechaCreacion, visitante.tiempoSalida || visitante.fechaSalida)
					);
					
					// Agregar costo si corresponde
					if (incluirCosto) {
						const costo = visitante.vehiculo ? calcularCostoTotal(visitante) : 0;
						totalCosto += costo;
						row.push(costo > 0 ? `$${costo.toLocaleString('es-CO')}` : '-');
					}
					
					// Autorizado por (siempre al final)
					row.push(capitalizarNombre(visitante.autorizadoPor));
					
					return row;
				});
				
				// DIBUJAR ENCABEZADO DE LA TABLA
				const headerHeight = 12;
				doc.setFillColor(240, 240, 240);
				doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F');
				
				// Bordes del encabezado
				doc.setLineWidth(0.5);
				doc.setDrawColor(0, 0, 0);
				doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight);
				
				// Texto del encabezado
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(8);
				doc.setTextColor(0, 0, 0);
				
				let xPos = margin;
				tableHeaders.forEach((header, index) => {
					// Centrar texto en cada celda del encabezado
					const textWidth = doc.getTextWidth(header);
					const cellCenter = xPos + (colWidths[index] / 2) - (textWidth / 2);
					doc.text(header, cellCenter, yPosition + 8);
					
					// Líneas verticales entre columnas
					if (index < tableHeaders.length - 1) {
						doc.line(xPos + colWidths[index], yPosition, xPos + colWidths[index], yPosition + headerHeight);
					}
					
					xPos += colWidths[index];
				});
				
				yPosition += headerHeight;
				
				// DIBUJAR FILAS DE DATOS
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(7);
				
				tableData.forEach((row, rowIndex) => {
					const rowHeight = 8;
					
					// Verificar si necesita nueva página
					if (yPosition + rowHeight > pageHeight - 30) {
						doc.addPage('landscape');
						yPosition = margin + 10;
						
						// Redibujar encabezado en nueva página
						doc.setFillColor(240, 240, 240);
						doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F');
						doc.setLineWidth(0.5);
						doc.setDrawColor(0, 0, 0);
						doc.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight);
						
						doc.setFont('helvetica', 'bold');
						doc.setFontSize(8);
						xPos = margin;
						tableHeaders.forEach((header, index) => {
							const textWidth = doc.getTextWidth(header);
							const cellCenter = xPos + (colWidths[index] / 2) - (textWidth / 2);
							doc.text(header, cellCenter, yPosition + 8);
							
							if (index < tableHeaders.length - 1) {
								doc.line(xPos + colWidths[index], yPosition, xPos + colWidths[index], yPosition + headerHeight);
							}
							xPos += colWidths[index];
						});
						
						yPosition += headerHeight;
						doc.setFont('helvetica', 'normal');
						doc.setFontSize(7);
					}
					
					// Fondo alternado para las filas
					if (rowIndex % 2 === 0) {
						doc.setFillColor(250, 250, 250);
						doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
					}
					
					// Bordes de la fila
					doc.setLineWidth(0.3);
					doc.setDrawColor(200, 200, 200);
					doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight);
					
					// Contenido de las celdas - TODO CENTRADO
					doc.setTextColor(0, 0, 0);
					xPos = margin;
					row.forEach((cellData, cellIndex) => {
						let texto = String(cellData || '-');
						
						// Truncar texto si es muy largo
						const maxChars = Math.floor(colWidths[cellIndex] * 1.2);
						if (texto.length > maxChars) {
							texto = texto.substring(0, maxChars - 3) + '...';
						}
						
						// CENTRAR TEXTO EN CADA CELDA
						const textWidth = doc.getTextWidth(texto);
						const cellCenter = xPos + (colWidths[cellIndex] / 2) - (textWidth / 2);
						doc.text(texto, cellCenter, yPosition + 5.5);
						
						// Líneas verticales entre columnas
						if (cellIndex < row.length - 1) {
							doc.line(xPos + colWidths[cellIndex], yPosition, xPos + colWidths[cellIndex], yPosition + rowHeight);
						}
						
						xPos += colWidths[cellIndex];
					});
					
					yPosition += rowHeight;
				});
				
				// AGREGAR TOTAL AL FINAL
				if (incluirCosto && totalCosto > 0) {
					yPosition += 10;
					
					// Verificar espacio para el total
					if (yPosition + 20 > pageHeight - 20) {
						doc.addPage('landscape');
						yPosition = margin + 20;
					}
					
					doc.setFont('helvetica', 'bold');
					doc.setFontSize(12);
					doc.setTextColor(0, 120, 0);
					
					const textoTotal = `TOTAL GENERADO: $${totalCosto.toLocaleString('es-CO')}`;
					doc.text(textoTotal, pageWidth - margin - 80, yPosition);
					
					// Subrayar el total
					const totalWidth = doc.getTextWidth(textoTotal);
					doc.setLineWidth(1);
					doc.line(pageWidth - margin - 80, yPosition + 2, pageWidth - margin - 80 + totalWidth, yPosition + 2);
				}
				
				// PIE DE PÁGINA
				yPosition = pageHeight - 15;
				doc.setFont('helvetica', 'italic');
				doc.setFontSize(8);
				doc.setTextColor(120, 120, 120);
				doc.text(`${textoFiltro}`, margin, yPosition);
				doc.text(`GestCloud © ${new Date().getFullYear()}`, pageWidth - margin - 50, yPosition);
				
				// GUARDAR PDF con nombre descriptivo
				const fechaActual = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
				let nombreArchivo = `historial-visitantes-${fechaActual}`;
				
				switch(filtroTipoActual) {
					case 'con-vehiculo':
						nombreArchivo += '-con-vehiculo';
						break;
					case 'sin-vehiculo':
						nombreArchivo += '-sin-vehiculo';
						break;
				}
				
				doc.save(`${nombreArchivo}.pdf`);
				
				// Restaurar botón
				btnPDF.innerHTML = textoOriginal;
				btnPDF.disabled = false;
				
				// Cerrar modal y mostrar éxito
				ocultarModal(modalExportar);
				if (window.mostrarAlert) {
					window.mostrarAlert('PDF exportado exitosamente', 'success');
				}
				
			} catch (error) {
				console.error('Error exportando PDF:', error);
				
				// Restaurar botón en caso de error
				const btnPDF = document.getElementById('exportar-pdf');
				btnPDF.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text w-5 h-5 mr-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14,2 L14,8 L20,8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
					Exportar como PDF
				`;
				btnPDF.disabled = false;
				
				if (window.mostrarAlert) {
					window.mostrarAlert(`Error al generar PDF: ${error.message}`, 'error');
				}
			}
		}

		async function exportarExcel() {
			try {
				// Mostrar indicador de carga
				const btnExcel = document.getElementById('exportar-excel');
				const textoOriginal = btnExcel.innerHTML;
				btnExcel.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin -ml-1 mr-3 h-5 w-5 text-white"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
					Generando Excel...
				`;
				btnExcel.disabled = true;

				// Importar XLSX dinámicamente
				const XLSX = await import('xlsx');
				
				// Preparar datos para Excel
				const datosExcel = historialFiltrado.map(visitante => ({
					'Nombre': capitalizarNombre(visitante.nombre),
					'Cédula': visitante.cedula,
					'Celular': visitante.celular,
					'Apartamento': visitante.apartamento.toUpperCase(),
					'Autorizado por': capitalizarNombre(visitante.autorizadoPor),
					'Fecha de Entrada': formatearFecha(visitante.tiempoEntrada || visitante.fechaCreacion),
					'Fecha de Salida': formatearFecha(visitante.tiempoSalida || visitante.fechaSalida),
					'Tiempo de Permanencia': calcularDuracion(visitante.tiempoEntrada || visitante.fechaCreacion, visitante.tiempoSalida || visitante.fechaSalida)
				}));
				
				// Crear libro de trabajo
				const libro = XLSX.utils.book_new();
				
				// Crear hoja de cálculo
				const hoja = XLSX.utils.json_to_sheet(datosExcel);
				
				// Configurar anchos de columna
				const anchosColumna = [
					{ wch: 25 }, // Nombre
					{ wch: 15 }, // Cédula
					{ wch: 15 }, // Celular
					{ wch: 12 }, // Apartamento
					{ wch: 25 }, // Autorizado por
					{ wch: 20 }, // Fecha Entrada
					{ wch: 20 }, // Fecha Salida
					{ wch: 18 }  // Permanencia
				];
				hoja['!cols'] = anchosColumna;
				
				// Agregar información del reporte
				const infoReporte = [
					['Historial de Visitantes - GestCloud'],
					[`Generado el: ${new Date().toLocaleString('es-CO')}`],
					[`Total de registros: ${historialFiltrado.length}`],
					[''], // Fila vacía
				];
				
				// Insertar información al inicio
				XLSX.utils.sheet_add_aoa(hoja, infoReporte, { origin: 'A1' });
				
				// Mover los datos principales 4 filas hacia abajo
				const range = XLSX.utils.decode_range(hoja['!ref']);
				range.s.r = 4; // Comenzar desde la fila 5 (índice 4)
				hoja['!ref'] = XLSX.utils.encode_range(range);
				
				// Agregar la hoja al libro
				XLSX.utils.book_append_sheet(libro, hoja, 'Historial Visitantes');
				
				// Generar y descargar archivo
				const fechaActual = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
				const nombreArchivo = `historial-visitantes-${fechaActual}.xlsx`;
				
				XLSX.writeFile(libro, nombreArchivo);
				
				// Restaurar botón
				btnExcel.innerHTML = textoOriginal;
				btnExcel.disabled = false;
				
				// Cerrar modal y mostrar éxito
				ocultarModal(modalExportar);
				if (window.mostrarAlert) {
					window.mostrarAlert('Excel exportado exitosamente', 'success');
				}
				
			} catch (error) {
				console.error('Error exportando Excel:', error);
				
				// Restaurar botón en caso de error
				const btnExcel = document.getElementById('exportar-excel');
				btnExcel.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet w-5 h-5 mr-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14,2 L14,8 L20,8"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
					Exportar como Excel
				`;
				btnExcel.disabled = false;
				
				if (window.mostrarAlert) {
					window.mostrarAlert(`Error al generar Excel: ${error.message}`, 'error');
				}
			}
		}

		// Conectar botones del modal de exportación
		document.getElementById('exportar-pdf').addEventListener('click', exportarPDF);
		document.getElementById('exportar-excel').addEventListener('click', exportarExcel);

		// Guardar cambios
		document.getElementById('guardar-cambios').addEventListener('click', async () => {
			if (visitanteEditando) {
				try {
					const datosActualizados = {
						nombre: document.getElementById('nombre').value,
						cedula: document.getElementById('cedula').value,
						celular: document.getElementById('celular').value,
						apartamento: document.getElementById('apartamento').value,
						autorizadoPor: document.getElementById('autorizadoPor').value
					};
					
					// Actualizar en Firebase
					const { updateDoc, doc } = await import('firebase/firestore');
					const visitanteRef = doc(db, 'visitantes', visitanteEditando.id);
					await updateDoc(visitanteRef, datosActualizados);
					
					ocultarModal(modalVisitante);
					if (window.mostrarAlert) {
						window.mostrarAlert('Visitante actualizado correctamente', 'success');
					}
					
				} catch (error) {
					console.error('Error actualizando visitante:', error);
					if (window.mostrarAlert) {
						window.mostrarAlert('Error al actualizar visitante', 'error');
					}
				}
			}
		});

		// Confirmar eliminación
		document.getElementById('confirmar-eliminar').addEventListener('click', async () => {
			if (visitanteEditando) {
				try {
					// Eliminar de Firebase - Eliminación definitiva de ambas colecciones
					const { deleteDoc, doc, getDoc } = await import('firebase/firestore');
					
					console.log('🗑️ Iniciando eliminación definitiva del visitante:', visitanteEditando.id);
					
					let eliminacionesExitosas = 0;
					const erroresEliminacion = [];
					
					// 1. Eliminar de la colección principal 'visitantes'
					try {
						const visitanteRef = doc(db, 'visitantes', visitanteEditando.id);
						const visitanteDoc = await getDoc(visitanteRef);
						
						if (visitanteDoc.exists()) {
							await deleteDoc(visitanteRef);
							console.log('✅ Eliminado de colección "visitantes"');
							eliminacionesExitosas++;
						} else {
							console.log('ℹ️ No encontrado en colección "visitantes"');
						}
					} catch (error) {
						console.error('❌ Error eliminando de "visitantes":', error);
						erroresEliminacion.push(`visitantes: ${error.message}`);
					}
					
					// 2. Eliminar de la colección de historial 'visitantes_historial' si existe
					try {
						const historialRef = doc(db, 'visitantes_historial', visitanteEditando.id);
						const historialDoc = await getDoc(historialRef);
						
						if (historialDoc.exists()) {
							await deleteDoc(historialRef);
							console.log('✅ Eliminado de colección "visitantes_historial"');
							eliminacionesExitosas++;
						} else {
							console.log('ℹ️ No encontrado en colección "visitantes_historial"');
						}
					} catch (error) {
						console.error('❌ Error eliminando de "visitantes_historial":', error);
						erroresEliminacion.push(`visitantes_historial: ${error.message}`);
					}
					
					// Eliminación optimista mejorada
					const visitanteId = visitanteEditando.id;
					
					// Cerrar modal inmediatamente
					ocultarModal(modalEliminar);
					
					// Eliminar de Firebase en segundo plano
					// Los arrays locales se actualizarán automáticamente por el listener
					// pero mostramos notificación inmediatamente
					
					if (eliminacionesExitosas > 0) {
						const mensaje = eliminacionesExitosas === 1 ? 
							'Registro eliminado definitivamente' : 
							`Registro eliminado definitivamente de ${eliminacionesExitosas} ubicaciones`;
						
						// Usar mostrarAlert para mantener consistencia con otros mensajes
						if (window.mostrarAlert) {
							window.mostrarAlert(mensaje, 'success');
						}
					} else {
						const mensaje = 'El registro no se encontró en ninguna colección o ya fue eliminado';
						
						// Usar mostrarAlert para mantener consistencia con otros mensajes
						if (window.mostrarAlert) {
							window.mostrarAlert(mensaje, 'warning');
						}
					}
					
					if (erroresEliminacion.length > 0) {
						console.warn('⚠️ Algunos errores durante la eliminación:', erroresEliminacion);
					}
					
				} catch (error) {
					console.error('Error eliminando visitante:', error);
					
					// Cerrar modal inmediatamente incluso en caso de error
					ocultarModal(modalEliminar);
					
					// Mostrar notificación de error con el mismo patrón
					const mensaje = 'Error al eliminar registro';
					if (window.mostrarAlert) {
						window.mostrarAlert(mensaje, 'error');
					}
				}
			}
		});

		// Paginación
		document.getElementById('btn-anterior').addEventListener('click', () => {
			if (paginaActual > 1) {
				paginaActual--;
				renderizarTabla();
			}
		});

		document.getElementById('btn-siguiente').addEventListener('click', () => {
			const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina);
			if (paginaActual < totalPaginas) {
				paginaActual++;
				renderizarTabla();
			}
		});

		// Conectar con Firebase para obtener historial (mantenemos el listener pero controlado)
		if (window.escucharHistorialVisitantes) {
			unsubscribe = window.escucharHistorialVisitantes((visitantes) => {
				historialVisitantes = visitantes;
				historialFiltrado = [...visitantes];
				
				// Inicializar Fuse.js con los nuevos datos
				inicializarFuse();
				
				actualizarContadoresFiltrosHistorial();
				actualizarContadorBotonFiltrar();
				renderizarTabla();
			});
		}

		// Cleanup cuando se cierre la página
		window.addEventListener('beforeunload', () => {
			if (unsubscribe) unsubscribe();
		});

		// Nuevo: Abrir modal de registro desde el botón de la sección vacía
		const btnAbrirModalHistorial = document.getElementById('abrir-modal-visitante-historial');
		const modalRegistro = document.getElementById('modal-visitante');
		function abrirModalRegistro() {
			if (modalRegistro) {
				modalRegistro.classList.remove('hidden');
				modalRegistro.classList.remove('opacity-0', 'pointer-events-none');
				modalRegistro.classList.add('opacity-100');
				const inner = modalRegistro.querySelector('div');
				if (inner) {
					inner.classList.remove('scale-95');
					inner.classList.add('scale-100');
				}
			}
		}
		if (btnAbrirModalHistorial) {
			btnAbrirModalHistorial.addEventListener('click', abrirModalRegistro);
		}
	});
