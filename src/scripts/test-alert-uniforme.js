// Script de prueba para AlertNotification - Todos los tipos con icono uniforme
// Ejecutar en la consola del navegador para probar todos los alerts

console.log('🧪 Iniciando pruebas de AlertNotification - Diseño uniforme de Flowbite');

// Función para probar todos los tipos de alert
function probarTodosLosAlerts() {
    console.log('📝 Probando todos los tipos de alert con icono uniforme...');
    
    // Info alert (azul)
    setTimeout(() => {
        if (window.mostrarAlert) {
            window.mostrarAlert('Este es un alert de información con el icono estándar de Flowbite.', 'info', 4000);
            console.log('✅ Info alert mostrado');
        }
    }, 500);
    
    // Success alert (verde)
    setTimeout(() => {
        if (window.mostrarAlert) {
            window.mostrarAlert('¡Visitante registrado exitosamente! Usa el mismo icono que todos los demás alerts.', 'success', 4000);
            console.log('✅ Success alert mostrado');
        }
    }, 5000);
    
    // Error alert (rojo)
    setTimeout(() => {
        if (window.mostrarAlert) {
            window.mostrarAlert('Error al procesar la solicitud. Mismo icono, diferente color.', 'error', 4000);
            console.log('✅ Error alert mostrado');
        }
    }, 9500);
    
    // Warning alert (amarillo)
    setTimeout(() => {
        if (window.mostrarAlert) {
            window.mostrarAlert('Advertencia: Esta acción requiere confirmación. Icono uniforme en todos los tipos.', 'warning', 4000);
            console.log('✅ Warning alert mostrado');
        }
    }, 14000);
    
    console.log('🏁 Todas las pruebas programadas. Los alerts aparecerán cada 4.5 segundos.');
}

// Función para probar rapidamente (sin esperas)
function pruebaRapida() {
    console.log('⚡ Prueba rápida de todos los tipos...');
    
    if (window.mostrarAlert) {
        window.mostrarAlert('Información rápida', 'info', 2000);
        setTimeout(() => window.mostrarAlert('Éxito rápido', 'success', 2000), 100);
        setTimeout(() => window.mostrarAlert('Error rápido', 'error', 2000), 200);
        setTimeout(() => window.mostrarAlert('Advertencia rápida', 'warning', 2000), 300);
    }
}

// Función para verificar compatibilidad con mostrarToast
function probarCompatibilidad() {
    console.log('🔄 Probando compatibilidad con mostrarToast...');
    
    if (window.mostrarToast) {
        window.mostrarToast('Probando compatibilidad con mostrarToast - ¡Funciona!', 'success', 3000);
        console.log('✅ Compatibilidad con mostrarToast confirmada');
    } else {
        console.log('❌ mostrarToast no está disponible');
    }
}

// Verificar que las funciones estén disponibles
if (typeof window.mostrarAlert === 'function') {
    console.log('✅ window.mostrarAlert está disponible');
} else {
    console.log('❌ window.mostrarAlert NO está disponible');
}

if (typeof window.mostrarToast === 'function') {
    console.log('✅ window.mostrarToast está disponible (compatibilidad)');
} else {
    console.log('❌ window.mostrarToast NO está disponible');
}

// Exponer funciones globalmente para pruebas manuales
window.probarTodosLosAlerts = probarTodosLosAlerts;
window.pruebaRapida = pruebaRapida;
window.probarCompatibilidad = probarCompatibilidad;

console.log(`
🎯 Funciones de prueba disponibles:
• probarTodosLosAlerts() - Prueba todos los tipos con espaciado
• pruebaRapida() - Prueba rápida de todos los tipos
• probarCompatibilidad() - Verifica que mostrarToast funcione

💡 Ejemplo de uso manual:
mostrarAlert('Mi mensaje', 'success', 3000);
mostrarToast('Mi mensaje', 'error', 3000);
`);
