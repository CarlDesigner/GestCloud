// Script de UI para el formulario de registro de visitantes
import { registrarVisitante } from '../lib/firebase.ts';

// Esperar a que el DOM esté listo
export function inicializarFormularioVisitante() {
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

  // Mostrar/ocultar campos del vehículo
  if (agregarVehiculoCheckbox && vehiculoCampos) {
    agregarVehiculoCheckbox.addEventListener('change', () => {
      if (agregarVehiculoCheckbox.checked) {
        vehiculoCampos.classList.remove('hidden');
        tipoVehiculoSelect.required = true;
        placaVehiculoInput.required = true;
        colorVehiculoInput.required = true;
      } else {
        vehiculoCampos.classList.add('hidden');
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
    placaVehiculoInput.addEventListener('input', () => {
      placaVehiculoInput.value = placaVehiculoInput.value.toUpperCase();
    });
  }

  // Validaciones de cédula y celular
  const validarCedula = valor => /^[0-9]{6,12}$/.test(valor);
  const validarCelular = valor => /^3[0-9]{9}$/.test(valor);
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

  if (cedulaInput && cedulaError) {
    cedulaInput.addEventListener('input', () => ocultarError(cedulaInput, cedulaError));
    cedulaInput.addEventListener('blur', () => {
      if (cedulaInput.value && !validarCedula(cedulaInput.value)) {
        mostrarError(cedulaInput, cedulaError, 'La cédula debe contener solo números (6-12 dígitos)');
      }
    });
  }
  if (celularInput && celularError) {
    celularInput.addEventListener('input', () => ocultarError(celularInput, celularError));
    celularInput.addEventListener('blur', () => {
      if (celularInput.value && !validarCelular(celularInput.value)) {
        if (celularInput.value.length !== 10) {
          mostrarError(celularInput, celularError, 'El celular debe tener exactamente 10 dígitos');
        } else if (!celularInput.value.startsWith('3')) {
          mostrarError(celularInput, celularError, 'El celular debe empezar por 3');
        }
      }
    });
  }

  // Envío del formulario
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
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
        await registrarVisitante(visitanteData);
        if (window.mostrarToast) {
          window.mostrarToast('🎉 ¡Visitante registrado exitosamente!', 'success', 5000);
        }
        // Emitir evento global para cerrar el modal suavemente
        window.dispatchEvent(new Event('visitante-registrado-exito'));
        form.reset();
        ocultarError(cedulaInput, cedulaError);
        ocultarError(celularInput, celularError);
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
        console.error('Error:', error);
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
