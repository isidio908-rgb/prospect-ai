import jwt from 'jsonwebtoken';
import { query } from '../../database/init.mjs';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token não fornecido' 
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuário no banco
      const result = await query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Usuário não encontrado' 
        });
      }
      
      req.user = result.rows[0];
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado' 
        });
      }
      
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor' 
    });
  }
}
