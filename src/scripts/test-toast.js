// Script de prueba para verificar las notificaciones toast y modal de confirmación - GestCloud

// Función para probar diferentes tipos de notificaciones
function probarNotificaciones() {
  if (window.mostrarToast) {
    // Prueba de éxito con mensaje más llamativo
    setTimeout(() => {
      window.mostrarToast('🎉 ¡Visitante registrado exitosamente! Bienvenido al conjunto residencial', 'success', 5000);
    }, 1000);
    
    // Prueba de error
    setTimeout(() => {
      window.mostrarToast('❌ Error de conexión con Firebase', 'error', 4000);
    }, 2500);
    
    // Prueba de advertencia
    setTimeout(() => {
      window.mostrarToast('⚠️ Verificando datos del visitante...', 'warning', 3000);
    }, 4000);
    
    // Prueba de información
    setTimeout(() => {
      window.mostrarToast('ℹ️ Sistema funcionando correctamente', 'info', 3000);
    }, 5500);
}

// Función para probar el modal de confirmación
function probarModalConfirmacion() {
  if (window.mostrarConfirmSalida) {
    // Simular confirmación de salida de visitante
    window.mostrarConfirmSalida(
      'test-123', 
      'Juan Pérez Ejemplo', 
      (id, nombre) => {
        // Callback de prueba
        if (window.mostrarToast) {
          window.mostrarToast(
            `✅ Salida confirmada para ${nombre} (ID: ${id})`, 
            'success', 
            4000
          );
        }
      }
    );
    console.log('🧪 Modal de confirmación mostrado');
  } else {
    console.error('❌ Sistema de modal de confirmación no disponible');
  }
}

// Función para probar todo el sistema
function probarSistemaCompleto() {
  console.log('🧪 Iniciando pruebas completas del sistema...');
  
  // Primero probar toasts
  probarNotificaciones();
  
  // Después de 7 segundos probar modal
  setTimeout(() => {
    probarModalConfirmacion();
  }, 7000);
}

// Hacer funciones disponibles globalmente para testing
window.probarNotificaciones = probarNotificaciones;
window.probarModalConfirmacion = probarModalConfirmacion;
window.probarSistemaCompleto = probarSistemaCompleto;

// Auto-ejecutar si estamos en modo desarrollo (opcional)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🧪 Script de prueba cargado. Funciones disponibles:');
  console.log('  - window.probarNotificaciones() → Prueba solo toasts');
  console.log('  - window.probarModalConfirmacion() → Prueba solo modal');
  console.log('  - window.probarSistemaCompleto() → Prueba todo');
}
