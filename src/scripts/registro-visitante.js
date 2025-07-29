// Script del cliente para manejar el formulario de registro de visitantes
import { registrarVisitante } from '../lib/firebase.ts';

// Hacer disponible globalmente para el formulario
window.registrarVisitante = registrarVisitante;

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('visitante-form');
	const cedulaInput = document.getElementById('cedula');
	const celularInput = document.getElementById('celular');
	const cedulaError = document.getElementById('cedula-error');
	const celularError = document.getElementById('celular-error');

	// Elementos del vehículo
	const agregarVehiculoCheckbox = document.getElementById('agregar-vehiculo');
	const vehiculoCampos = document.getElementById('vehiculo-campos');
	const tipoVehiculoSelect = document.getElementById('tipo-vehiculo');
	const placaVehiculoInput = document.getElementById('placa-vehiculo');
	const colorVehiculoInput = document.getElementById('color-vehiculo');

	// Función para validar cédula
	function validarCedula(cedula) {
		const regex = /^[0-9]{6,12}$/;
		return regex.test(cedula);
	}

	// Función para validar celular colombiano
	function validarCelular(celular) {
		const regex = /^3[0-9]{9}$/;
		return regex.test(celular);
	}

	// Función para mostrar/ocultar errores
	function mostrarError(input, errorElement, mensaje) {
		input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
		input.classList.remove('border-gray-300', 'focus:border-primary-600', 'focus:ring-primary-600');
		errorElement.textContent = mensaje;
		errorElement.classList.remove('hidden');
	}

	function ocultarError(input, errorElement) {
		input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
		input.classList.add('border-gray-300', 'focus:border-primary-600', 'focus:ring-primary-600');
		errorElement.classList.add('hidden');
	}

	// Función para permitir solo números y mostrar mensaje si se intenta escribir letras
	function soloNumeros(event, errorElement, campoNombre) {
		const char = String.fromCharCode(event.which);
		if (!/[0-9]/.test(char)) {
			event.preventDefault();
			// Mostrar mensaje temporal cuando se intenta escribir letras
			mostrarError(event.target, errorElement, `Solo se permiten números en el campo ${campoNombre}`);
			
			// Ocultar el mensaje después de 2 segundos
			setTimeout(() => {
				if (event.target.value && ((campoNombre === 'cédula' && validarCedula(event.target.value)) || 
					(campoNombre === 'celular' && validarCelular(event.target.value)))) {
					ocultarError(event.target, errorElement);
				}
			}, 2000);
		}
	}

	// Manejar mostrar/ocultar campos del vehículo
	if (agregarVehiculoCheckbox && vehiculoCampos) {
		agregarVehiculoCheckbox.addEventListener('change', function() {
			if (this.checked) {
				vehiculoCampos.classList.remove('hidden');
				// Hacer campos requeridos
				tipoVehiculoSelect.required = true;
				placaVehiculoInput.required = true;
				colorVehiculoInput.required = true;
			} else {
				vehiculoCampos.classList.add('hidden');
				// Remover required y limpiar campos
				tipoVehiculoSelect.required = false;
				placaVehiculoInput.required = false;
				colorVehiculoInput.required = false;
				tipoVehiculoSelect.value = '';
				placaVehiculoInput.value = '';
				colorVehiculoInput.value = '';
			}
		});
	}

	// Formatear placa en tiempo real
	if (placaVehiculoInput) {
		placaVehiculoInput.addEventListener('input', function() {
			this.value = this.value.toUpperCase();
		});
	}

	// Event listeners para campos numéricos
	if (cedulaInput) {
		// Permitir solo números mientras se escribe y mostrar mensaje si se intenta escribir letras
		cedulaInput.addEventListener('keypress', (event) => {
			soloNumeros(event, cedulaError, 'cédula');
		});
		
		// Validar en tiempo real
		cedulaInput.addEventListener('input', function() {
			const valor = this.value;
			if (valor && !validarCedula(valor)) {
				mostrarError(this, cedulaError, 'La cédula debe contener solo números (6-12 dígitos)');
			} else {
				ocultarError(this, cedulaError);
			}
		});

		// Validar al salir del campo
		cedulaInput.addEventListener('blur', function() {
			const valor = this.value;
			if (valor && !validarCedula(valor)) {
				mostrarError(this, cedulaError, 'La cédula debe contener solo números (6-12 dígitos)');
			}
		});
	}

	if (celularInput) {
		// Permitir solo números mientras se escribe y mostrar mensaje si se intenta escribir letras
		celularInput.addEventListener('keypress', (event) => {
			soloNumeros(event, celularError, 'celular');
		});
		
		// Validar en tiempo real
		celularInput.addEventListener('input', function() {
			const valor = this.value;
			if (valor && !validarCelular(valor)) {
				if (valor.length !== 10) {
					mostrarError(this, celularError, 'El celular debe tener exactamente 10 dígitos');
				} else if (!valor.startsWith('3')) {
					mostrarError(this, celularError, 'El celular debe empezar por 3');
				} else {
					mostrarError(this, celularError, 'Formato de celular inválido');
				}
			} else {
				ocultarError(this, celularError);
			}
		});

		// Validar al salir del campo
		celularInput.addEventListener('blur', function() {
			const valor = this.value;
			if (valor && !validarCelular(valor)) {
				if (valor.length !== 10) {
					mostrarError(this, celularError, 'El celular debe tener exactamente 10 dígitos');
				} else if (!valor.startsWith('3')) {
					mostrarError(this, celularError, 'El celular debe empezar por 3');
				}
			}
		});
	}

	// Manejar envío del formulario
	if (form) {
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			
			// Validar campos antes de enviar
			let formularioValido = true;
			
			if (cedulaInput && !validarCedula(cedulaInput.value)) {
				mostrarError(cedulaInput, cedulaError, 'La cédula debe contener solo números (6-12 dígitos)');
				formularioValido = false;
			}
			
			if (celularInput && !validarCelular(celularInput.value)) {
				mostrarError(celularInput, celularError, 'El celular debe tener 10 dígitos y empezar por 3');
				formularioValido = false;
			}
			
			if (!formularioValido) {
				if (window.mostrarToast) {
					window.mostrarToast('Por favor corrige los errores en el formulario', 'error', 3000);
				}
				return;
			}
			
			// Deshabilitar el botón mientras se procesa
			const submitButton = form.querySelector('button[type="submit"]');
			const originalHTML = submitButton.innerHTML;
			submitButton.disabled = true;
			submitButton.innerHTML = `
				<span>Registrando...</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hourglass animate-pulse">
					<path d="M5 22h14"/>
					<path d="M5 2h14"/>
					<path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
					<path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
				</svg>
			`;

			try {
				// Obtener datos del formulario
				const formData = new FormData(form);
				const visitanteData = {
					nombre: formData.get('nombre'),
					cedula: formData.get('cedula'),
					celular: formData.get('celular'),
					apartamento: formData.get('apartamento'),
					autorizadoPor: formData.get('autorizadoPor')
				};

				// Agregar datos del vehículo si está marcado
				const tieneVehiculo = formData.get('tieneVehiculo');
				if (tieneVehiculo && agregarVehiculoCheckbox.checked) {
					const tipoVehiculo = formData.get('tipoVehiculo');
					const placa = formData.get('placa');
					const color = formData.get('color');
					
					if (tipoVehiculo && placa && color) {
						visitanteData.vehiculo = {
							tipo: tipoVehiculo,
							placa: placa.toString().toUpperCase(),
							color
						};
					}
				}

				// Registrar en Firebase
				await window.registrarVisitante(visitanteData);

				// Mostrar notificación de éxito con toast mejorado
				if (window.mostrarToast) {
					window.mostrarToast('🎉 ¡Visitante registrado exitosamente!', 'success', 5000);
				}
				
				// Limpiar formulario
				form.reset();
				// Ocultar errores al limpiar
				ocultarError(cedulaInput, cedulaError);
				ocultarError(celularInput, celularError);
				
				// Ocultar campos del vehículo
				if (vehiculoCampos) {
					vehiculoCampos.classList.add('hidden');
					tipoVehiculoSelect.required = false;
					placaVehiculoInput.required = false;
					colorVehiculoInput.required = false;
				}

			} catch (error) {
				// Mostrar notificación de error con toast
				const mensajeError = error.message || 'Error al registrar visitante. Intenta nuevamente.';
				if (window.mostrarToast) {
					window.mostrarToast(`Error: ${mensajeError}`, 'error', 5000);
				}
				console.error('Error:', error);
			} finally {
				// Rehabilitar botón
				submitButton.disabled = false;
				submitButton.innerHTML = originalHTML;
			}
		});
	}
}); 
