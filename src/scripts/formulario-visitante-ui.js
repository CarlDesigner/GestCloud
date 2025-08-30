// Script de UI para el formulario de registro de visitantes
import { registrarVisitante, obtenerProximoParqueaderoDisponible } from '../lib/firebase.ts';

// Hacer las funciones globalmente disponibles
window.registrarVisitante = registrarVisitante;
window.obtenerProximoParqueaderoDisponible = obtenerProximoParqueaderoDisponible;

// Esperar a que el DOM esté listo
export function inicializarFormularioVisitante() {
  const form = document.getElementById('visitante-form');
  
  // Elementos de los campos principales
  const nombreInput = document.getElementById('nombre');
  const cedulaInput = document.getElementById('cedula');
  const celularInput = document.getElementById('celular');
  const apartamentoInput = document.getElementById('apartamento');
  const autorizadoInput = document.getElementById('autorizado-por');
  
  // Elementos de errores
  const nombreError = document.getElementById('nombre-error');
  const cedulaError = document.getElementById('cedula-error');
  const celularError = document.getElementById('celular-error');
  const apartamentoError = document.getElementById('apartamento-error');
  const autorizadoError = document.getElementById('autorizado-error');

  // Elementos del vehículo
  const agregarVehiculoCheckbox = document.getElementById('agregar-vehiculo');
  const vehiculoCampos = document.getElementById('vehiculo-campos');
  const tipoVehiculoSelect = document.getElementById('tipo-vehiculo');
  const placaVehiculoInput = document.getElementById('placa-vehiculo');
  const colorVehiculoInput = document.getElementById('color-vehiculo');

  // Elementos del parqueadero
  const parqueaderoInfoGroup = document.getElementById('parqueadero-info-group');
  const parqueaderoTexto = document.getElementById('parqueadero-asignado-texto');

  // Función para actualizar el texto del parqueadero
  const actualizarParqueaderoDisponible = async () => {
    if (parqueaderoTexto) {
      parqueaderoTexto.textContent = 'Consultando disponibilidad...';
      parqueaderoTexto.className = 'text-sm font-medium text-green-800 dark:text-green-200';
      try {
        const proximoParqueadero = await window.obtenerProximoParqueaderoDisponible();
        if (proximoParqueadero) {
          parqueaderoTexto.textContent = `Parqueadero ${proximoParqueadero}`;
          parqueaderoTexto.className = 'text-sm font-medium text-green-800 dark:text-green-200';
        } else {
          parqueaderoTexto.textContent = 'No hay parqueaderos disponibles';
          parqueaderoTexto.className = 'text-sm font-medium text-red-800 dark:text-red-200';
        }
      } catch (error) {
        parqueaderoTexto.textContent = 'Error al consultar parqueaderos';
        parqueaderoTexto.className = 'text-sm font-medium text-red-800 dark:text-red-200';
      }
    }
  };

  // Mostrar/ocultar campos del vehículo y gestión de parqueaderos
  if (agregarVehiculoCheckbox && vehiculoCampos && parqueaderoInfoGroup) {
    let intervalId = null;
    
    agregarVehiculoCheckbox.addEventListener('change', async () => {
      if (agregarVehiculoCheckbox.checked) {
        vehiculoCampos.classList.remove('hidden');
        tipoVehiculoSelect.required = true;
        placaVehiculoInput.required = true;
        colorVehiculoInput.required = true;
        // Mostrar mensaje informativo de asignación automática
        parqueaderoInfoGroup.classList.remove('hidden');
        // Actualizar el parqueadero disponible
        actualizarParqueaderoDisponible();
        // Actualizar cada 15 segundos mientras esté visible
        intervalId = setInterval(actualizarParqueaderoDisponible, 15000);
      } else {
        vehiculoCampos.classList.add('hidden');
        tipoVehiculoSelect.required = false;
        placaVehiculoInput.required = false;
        colorVehiculoInput.required = false;
        parqueaderoInfoGroup.classList.add('hidden');
        // Limpiar el intervalo
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        // Limpiar valores
        tipoVehiculoSelect.value = '';
        placaVehiculoInput.value = '';
        colorVehiculoInput.value = '';
      }
    });
  }

  // Formatear placa en tiempo real
  if (placaVehiculoInput) {
    placaVehiculoInput.addEventListener('input', () => {
      placaVehiculoInput.value = placaVehiculoInput.value.toUpperCase();
    });
  }

  // Funciones de validación estrictas
  const validarNombre = valor => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(valor);
  const validarCedula = valor => /^[0-9]{6,10}$/.test(valor);
  const validarCelular = valor => /^3[0-9]{9}$/.test(valor);
  const validarApartamento = valor => /^[0-9]+$/.test(valor);
  const validarAutorizado = valor => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(valor);

  // Funciones de manejo de errores
  const mostrarError = (input, errorEl, mensaje) => {
    input.classList.add('border-red-500');
    const el = errorEl;
    if (el) {
      el.textContent = mensaje;
      el.classList.remove('hidden');
    }
  };

  const ocultarError = (input, errorEl) => {
    input.classList.remove('border-red-500');
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
  };

  // Validación de nombre (solo letras y espacios)
  if (nombreInput && nombreError) {
    nombreInput.addEventListener('input', (e) => {
      // Eliminar caracteres no válidos en tiempo real
      const valor = e.target.value;
      const valorLimpio = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
      if (valor !== valorLimpio) {
        e.target.value = valorLimpio;
        mostrarError(nombreInput, nombreError, 'El nombre solo puede contener letras y espacios');
      } else {
        ocultarError(nombreInput, nombreError);
      }
    });
    
    nombreInput.addEventListener('blur', () => {
      if (nombreInput.value && !validarNombre(nombreInput.value)) {
        mostrarError(nombreInput, nombreError, 'El nombre solo puede contener letras y espacios');
      }
    });
  }

  // Validación de cédula (solo números, 6-10 dígitos)
  if (cedulaInput && cedulaError) {
    cedulaInput.addEventListener('input', (e) => {
      // Eliminar caracteres no numéricos en tiempo real
      const valor = e.target.value;
      const valorLimpio = valor.replace(/[^0-9]/g, '');
      if (valor !== valorLimpio) {
        e.target.value = valorLimpio;
        mostrarError(cedulaInput, cedulaError, 'La cédula debe contener solo números');
      } else {
        ocultarError(cedulaInput, cedulaError);
      }
    });
    
    cedulaInput.addEventListener('blur', () => {
      if (cedulaInput.value && !validarCedula(cedulaInput.value)) {
        mostrarError(cedulaInput, cedulaError, 'La cédula debe contener solo números (6-10 dígitos)');
      }
    });
  }

  // Validación de celular (solo números, 10 dígitos, empezar con 3)
  if (celularInput && celularError) {
    celularInput.addEventListener('input', (e) => {
      // Eliminar caracteres no numéricos en tiempo real
      const valor = e.target.value;
      const valorLimpio = valor.replace(/[^0-9]/g, '');
      if (valor !== valorLimpio) {
        e.target.value = valorLimpio;
        mostrarError(celularInput, celularError, 'El celular debe contener solo números');
      } else {
        ocultarError(celularInput, celularError);
      }
    });
    
    celularInput.addEventListener('blur', () => {
      if (celularInput.value && !validarCelular(celularInput.value)) {
        mostrarError(celularInput, celularError, 'El celular debe tener 10 dígitos y empezar por 3');
      }
    });
  }

  // Validación de apartamento (solo números)
  if (apartamentoInput && apartamentoError) {
    apartamentoInput.addEventListener('input', (e) => {
      // Eliminar caracteres no numéricos en tiempo real
      const valor = e.target.value;
      const valorLimpio = valor.replace(/[^0-9]/g, '');
      if (valor !== valorLimpio) {
        e.target.value = valorLimpio;
        mostrarError(apartamentoInput, apartamentoError, 'El apartamento debe contener solo números');
      } else {
        ocultarError(apartamentoInput, apartamentoError);
      }
    });
    
    apartamentoInput.addEventListener('blur', () => {
      if (apartamentoInput.value && !validarApartamento(apartamentoInput.value)) {
        mostrarError(apartamentoInput, apartamentoError, 'El apartamento debe contener solo números');
      }
    });
  }

  // Validación de autorizado por (solo letras y espacios)
  if (autorizadoInput && autorizadoError) {
    autorizadoInput.addEventListener('input', (e) => {
      // Eliminar caracteres no válidos en tiempo real
      const valor = e.target.value;
      const valorLimpio = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
      if (valor !== valorLimpio) {
        e.target.value = valorLimpio;
        mostrarError(autorizadoInput, autorizadoError, 'El nombre del autorizador solo puede contener letras y espacios');
      } else {
        ocultarError(autorizadoInput, autorizadoError);
      }
    });
    
    autorizadoInput.addEventListener('blur', () => {
      if (autorizadoInput.value && !validarAutorizado(autorizadoInput.value)) {
        mostrarError(autorizadoInput, autorizadoError, 'El nombre del autorizador solo puede contener letras y espacios');
      }
    });
  }

  // Envío del formulario
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let formularioValido = true;
      
      // Validar todos los campos
      if (nombreInput && !validarNombre(nombreInput.value)) {
        mostrarError(nombreInput, nombreError, 'El nombre solo puede contener letras y espacios');
        formularioValido = false;
      }
      
      if (cedulaInput && !validarCedula(cedulaInput.value)) {
        mostrarError(cedulaInput, cedulaError, 'La cédula debe contener solo números (6-10 dígitos)');
        formularioValido = false;
      }
      
      if (celularInput && !validarCelular(celularInput.value)) {
        mostrarError(celularInput, celularError, 'El celular debe tener 10 dígitos y empezar por 3');
        formularioValido = false;
      }
      
      if (apartamentoInput && !validarApartamento(apartamentoInput.value)) {
        mostrarError(apartamentoInput, apartamentoError, 'El apartamento debe contener solo números');
        formularioValido = false;
      }
      
      if (autorizadoInput && !validarAutorizado(autorizadoInput.value)) {
        mostrarError(autorizadoInput, autorizadoError, 'El nombre del autorizador solo puede contener letras y espacios');
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
        const formData = new FormData(form);
        const nombre = formData.get('nombre');
        const cedula = formData.get('cedula');
        const celular = formData.get('celular');
        const apartamento = formData.get('apartamento');
        const autorizadoPor = formData.get('autorizadoPor');
        const visitanteData = { nombre, cedula, celular, apartamento, autorizadoPor };

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

        await window.registrarVisitante(visitanteData);
        
        if (window.mostrarToast) {
          window.mostrarToast('🎉 ¡Visitante registrado exitosamente!', 'success', 5000);
        }

        // Emitir evento global para cerrar el modal suavemente
        window.dispatchEvent(new Event('visitante-registrado-exito'));
        
        // Resetear formulario y errores
        form.reset();
        ocultarError(nombreInput, nombreError);
        ocultarError(cedulaInput, cedulaError);
        ocultarError(celularInput, celularError);
        ocultarError(apartamentoInput, apartamentoError);
        ocultarError(autorizadoInput, autorizadoError);
        
        if (vehiculoCampos) {
          vehiculoCampos.classList.add('hidden');
          tipoVehiculoSelect.required = false;
          placaVehiculoInput.required = false;
          colorVehiculoInput.required = false;
        }
      } catch (error) {
        const mensajeError = error.message || 'Error al registrar visitante. Intenta nuevamente.';
        if (window.mostrarToast) {
          window.mostrarToast(`Error: ${mensajeError}`, 'error', 5000);
        }
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalHTML;
      }
    });
  }
}

// Inicializar automáticamente si el DOM ya está listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  inicializarFormularioVisitante();
} else {
  document.addEventListener('DOMContentLoaded', inicializarFormularioVisitante);
} 
