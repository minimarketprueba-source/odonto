module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva característica
        'fix',      // Corrección de bug
        'docs',     // Cambios en documentación
        'style',    // Formato, punto y coma faltantes, etc
        'refactor', // Refactorización de código
        'perf',     // Mejoras de performance
        'test',     // Añadir o corregir tests
        'build',    // Cambios en build system o dependencias
        'ci',       // Cambios en CI/CD
        'chore',    // Otras tareas de mantenimiento
        'revert',   // Revertir commit previo
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 100],
  },
}
