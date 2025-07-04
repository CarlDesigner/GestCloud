/**
 * Script de prueba para validar alertas unificadas en Historial de Visitantes
 * GestCloud - Sistema de Gestión Residencial
 * 
 * Este script simula las alertas que se muestran durante las operaciones del historial
 * para verificar que el diseño sea uniforme y moderno siguiendo Flowbite.
 */

console.log('🧪 Iniciando pruebas de alertas del Historial de Visitantes...');

// Simulación de datos de visitante para pruebas
const visitantePrueba = {
    id: 'test-123',
    nombre: 'Juan Carlos Pérez',
    cedula: '12345678',
    celular: '3201234567',
    apartamento: '101',
    autorizadoPor: 'María González',
    tiempoEntrada: new Date('2024-01-15T10:30:00'),
    tiempoSalida: new Date('2024-01-15T14:15:00')
};

// Función para probar alertas de historial
function probarAlertasHistorial() {
    console.log('🔍 Probando alertas del historial de visitantes...');
    
    // Simular diferentes tipos de alertas del historial
    setTimeout(() => {
        console.log('✅ Probando: Alerta de eliminación exitosa');
        if (window.mostrarAlert) {
            window.mostrarAlert('Registro eliminado definitivamente', 'success');
        }
    }, 1000);
    
    setTimeout(() => {
        console.log('⚠️ Probando: Alerta de registro no encontrado');
        if (window.mostrarAlert) {
            window.mostrarAlert('El registro no se encontró en ninguna colección o ya fue eliminado', 'warning');
        }
    }, 3000);
    
    setTimeout(() => {
        console.log('❌ Probando: Alerta de error al eliminar');
        if (window.mostrarAlert) {
            window.mostrarAlert('Error al eliminar registro', 'error');
        }
    }, 5000);
    
    setTimeout(() => {
        console.log('✅ Probando: Alerta de actualización exitosa');
        if (window.mostrarAlert) {
            window.mostrarAlert('Visitante actualizado correctamente', 'success');
        }
    }, 7000);
    
    setTimeout(() => {
        console.log('❌ Probando: Alerta de error al actualizar');
        if (window.mostrarAlert) {
            window.mostrarAlert('Error al actualizar visitante', 'error');
        }
    }, 9000);
    
    setTimeout(() => {
        console.log('ℹ️ Probando: Alerta informativa del historial');
        if (window.mostrarAlert) {
            window.mostrarAlert('Se encontraron múltiples registros para este visitante', 'info');
        }
    }, 11000);
}

// Función para verificar que el componente AlertNotification esté cargado
function verificarComponenteAlert() {
    if (typeof window.mostrarAlert === 'function') {
        console.log('✅ Componente AlertNotification detectado correctamente');
        return true;
    } else {
        console.warn('⚠️ Componente AlertNotification no detectado');
        return false;
    }
}

// Función para simular eliminación de visitante
function simularEliminacionVisitante() {
    console.log('🗑️ Simulando eliminación de visitante del historial...');
    
    // Simular el proceso de eliminación
    setTimeout(() => {
        console.log('🔄 Procesando eliminación...');
        
        // Simular eliminación exitosa
        if (Math.random() > 0.2) { // 80% de éxito
            console.log('✅ Eliminación exitosa simulada');
            if (window.mostrarAlert) {
                window.mostrarAlert('Registro eliminado definitivamente', 'success');
            }
        } else {
            console.log('❌ Error de eliminación simulado');
            if (window.mostrarAlert) {
                window.mostrarAlert('Error al eliminar registro', 'error');
            }
        }
    }, 1500);
}

// Función para simular actualización de visitante
function simularActualizacionVisitante() {
    console.log('✏️ Simulando actualización de visitante del historial...');
    
    setTimeout(() => {
        console.log('🔄 Procesando actualización...');
        
        // Simular actualización exitosa
        if (Math.random() > 0.15) { // 85% de éxito
            console.log('✅ Actualización exitosa simulada');
            if (window.mostrarAlert) {
                window.mostrarAlert('Visitante actualizado correctamente', 'success');
            }
        } else {
            console.log('❌ Error de actualización simulado');
            if (window.mostrarAlert) {
                window.mostrarAlert('Error al actualizar visitante', 'error');
            }
        }
    }, 1200);
}

// Función principal de testing
function iniciarPruebasHistorial() {
    console.log('🚀 Iniciando suite de pruebas para Historial de Visitantes...');
    
    // Verificar componente
    if (verificarComponenteAlert()) {
        console.log('🎯 Ejecutando pruebas de alertas...');
        probarAlertasHistorial();
        
        // Pruebas específicas de operaciones del historial
        setTimeout(() => {
            simularEliminacionVisitante();
        }, 13000);
        
        setTimeout(() => {
            simularActualizacionVisitante();
        }, 16000);
        
        setTimeout(() => {
            console.log('🏁 Todas las pruebas del historial completadas');
            console.log('📊 Resumen: Se probaron alertas de eliminación, actualización y errores');
            console.log('🎨 Verificar que todas las alertas usen el mismo diseño uniforme de Flowbite');
        }, 19000);
    } else {
        console.log('❌ No se puede ejecutar las pruebas sin el componente AlertNotification');
    }
}

// Auto-ejecutar cuando se carga el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPruebasHistorial);
} else {
    // DOM ya está cargado
    setTimeout(iniciarPruebasHistorial, 1000);
}

// Exportar funciones para uso manual
window.testHistorialAlertas = {
    iniciarPruebas: iniciarPruebasHistorial,
    probarEliminacion: simularEliminacionVisitante,
    probarActualizacion: simularActualizacionVisitante,
    probarTodasLasAlertas: probarAlertasHistorial
};

console.log('📋 Script de pruebas del historial cargado. Usa window.testHistorialAlertas para pruebas manuales');
