export function errorHandler(err, req, res, next) {
  console.error('❌ Erro:', err);

  // Erro de validação (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors
    });
  }

  // Erro de banco de dados
  if (err.code && err.code.startsWith('23')) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Registro já existe',
        field: err.constraint
      });
    }
    
    return res.status(400).json({
      error: 'Erro de validação no banco de dados'
    });
  }

  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor'
  });
}
