// Script de depuración para visitantes - GestCloud
// Usar en la consola del navegador para depurar problemas

console.log('🔧 Script de depuración cargado');

// Función para verificar el estado de Firebase
window.debugFirebase = function() {
    console.log('=== DIAGNÓSTICO FIREBASE ===');
    console.log('1. ¿Firebase App disponible?', !!window.firebase);
    console.log('2. ¿Firestore DB disponible?', !!window.__firestoreDb);
    console.log('3. ¿Función escuchar disponible?', !!window.escucharVisitantesActivos);
    console.log('4. ¿Función dar salida disponible?', !!window.darSalidaVisitante);
    
    if (window.__firestoreDb) {
        console.log('✅ Firestore está inicializado');
    } else {
        console.log('❌ Firestore NO está inicializado');
    }
};

// Función para listar visitantes activos
window.debugVisitantes = async function() {
    console.log('=== VISITANTES ACTIVOS ===');
    
    if (!window.__firestoreDb) {
        console.log('❌ Firestore no disponible');
        return;
    }
    
    try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(window.__firestoreDb, 'visitantes'), where('activo', '==', true));
        const snapshot = await getDocs(q);
        
        console.log(`📊 Total visitantes activos: ${snapshot.size}`);
        
        snapshot.forEach((doc) => {
            console.log(`👤 ${doc.id}:`, doc.data());
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo visitantes:', error);
    }
};

// Función para probar dar salida (sin confirmación)
window.debugDarSalida = async function(visitanteId) {
    console.log('=== PRUEBA DAR SALIDA ===');
    console.log('🚪 ID del visitante:', visitanteId);
    
    if (!window.darSalidaVisitante) {
        console.log('❌ Función darSalidaVisitante no disponible');
        return;
    }
    
    try {
        const resultado = await window.darSalidaVisitante(visitanteId);
        console.log('✅ Resultado:', resultado);
        return resultado;
    } catch (error) {
        console.error('❌ Error en dar salida:', error);
        console.error('📋 Detalles del error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return { error: error.message };
    }
};

// Función para verificar reglas de Firestore
window.debugPermisos = async function() {
    console.log('=== VERIFICACIÓN PERMISOS ===');
    
    if (!window.__firestoreDb) {
        console.log('❌ Firestore no disponible');
        return;
    }
    
    try {
        const { doc, getDoc, setDoc, collection } = await import('firebase/firestore');
        
        // Probar lectura de visitantes
        console.log('📖 Probando lectura de visitantes...');
        const visitantesRef = collection(window.__firestoreDb, 'visitantes');
        console.log('✅ Lectura de visitantes OK');
        
        // Probar escritura en historial
        console.log('✍️ Probando escritura en historial...');
        const testRef = doc(collection(window.__firestoreDb, 'visitantes_historial'));
        await setDoc(testRef, {
            _test: true,
            _timestamp: new Date().toISOString()
        });
        console.log('✅ Escritura en historial OK');
        
        // Eliminar documento de prueba
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(testRef);
        console.log('✅ Eliminación OK');
        
    } catch (error) {
        console.error('❌ Error de permisos:', error);
        
        if (error.code === 'permission-denied') {
            console.log('🚫 Las reglas de Firestore están bloqueando la operación');
        } else if (error.code === 'unavailable') {
            console.log('🌐 Problema de conectividad con Firebase');
        }
    }
};

// Auto-ejecutar diagnósticos básicos
setTimeout(() => {
    console.log('🔍 Ejecutando diagnósticos automáticos...');
    window.debugFirebase();
}, 2000);

console.log(`
📋 COMANDOS DISPONIBLES:
- debugFirebase() - Verificar estado de Firebase
- debugVisitantes() - Listar visitantes activos  
- debugDarSalida('ID_VISITANTE') - Probar dar salida
- debugPermisos() - Verificar permisos de Firestore

Ejemplo: debugDarSalida('abc123')
`);
