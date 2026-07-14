import jwt from 'jsonwebtoken';
import { query } from '../../database/init.mjs';
import { ensureUserWorkspace } from '../../services/tenancy.mjs';

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
      
      // Buscar usuário no banco, incluindo contexto profissional usado pela UI e IA.
      const result = await query(
        `SELECT id, email, name, profession, primary_niche, internal_context, approval_whatsapp, default_organization_id
         FROM users
         WHERE id = $1`,
        [decoded.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Usuário não encontrado' 
        });
      }
      
      const user = result.rows[0];
      const workspace = await ensureUserWorkspace(user);
      req.user = {
        ...user,
        organization_id: workspace?.id || user.default_organization_id || null,
        workspace,
      };
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
