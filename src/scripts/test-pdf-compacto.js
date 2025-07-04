// Script para probar la exportación PDF vertical compacta
console.log('🔍 Probando exportación PDF en formato VERTICAL...');

// Datos de prueba para verificar la distribución
const datosTest = [
    {
        nombre: 'Juan Carlos Rodríguez García',
        cedula: '12345678',
        celular: '3001234567',
        apartamento: '501A',
        autorizadoPor: 'María Elena Fernández López',
        tiempoEntrada: new Date('2024-01-15T08:30:00'),
        tiempoSalida: new Date('2024-01-15T14:45:00')
    },
    {
        nombre: 'Ana Patricia Muñoz Herrera',
        cedula: '87654321',
        celular: '3107654321',
        apartamento: '302B',
        autorizadoPor: 'Carlos Eduardo Vargas Silva',
        tiempoEntrada: new Date('2024-01-15T09:15:00'),
        tiempoSalida: new Date('2024-01-15T16:20:00')
    },
    {
        nombre: 'Roberto Antonio Jiménez Castro',
        cedula: '11223344',
        celular: '3151122334',
        apartamento: '104',
        autorizadoPor: 'Lucia Isabel Ramírez Torres',
        tiempoEntrada: new Date('2024-01-15T10:00:00'),
        tiempoSalida: new Date('2024-01-15T18:30:00')
    }
];

// Simular historialFiltrado
window.historialFiltrado = datosTest;

console.log('✅ Datos de prueba cargados:', datosTest.length, 'registros');
console.log('🎯 El PDF VERTICAL debería mostrar:');
console.log('   - Orientación PORTRAIT (vertical)');
console.log('   - Mejor altura para más filas por página');
console.log('   - Columnas ajustadas al ancho menor');
console.log('   - Texto truncado apropiadamente');
console.log('   - Lectura más natural (de arriba a abajo)');
console.log('   - Más espacio para contenido por la mayor altura');

// Habilitar botón de prueba
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Listo para probar exportación VERTICAL');
});
