import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = express.Router();

// Schema de validação
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  profession: z.string().min(2).max(255).optional(),
  primary_niche: z.string().max(255).optional(),
  internal_context: z.string().max(3000).optional()
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

export const updateMeSchema = z.object({
  name: z.string().min(2).max(255).optional().or(z.literal('')),
  profession: z.string().min(2).max(255).optional(),
  primary_niche: z.string().max(255).optional(),
  internal_context: z.string().max(3000).optional()
});

function toUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profession: user.profession || 'Gestor de Tráfego',
    primary_niche: user.primary_niche || '',
    internal_context: user.internal_context || ''
  };
}

// POST /api/auth/register - Criar conta
router.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      profession = 'Gestor de Tráfego',
      primary_niche,
      internal_context
    } = registerSchema.parse(req.body);
    
    // Verificar se email já existe
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email já cadastrado' 
      });
    }
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await query(
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, profession, primary_niche, internal_context, created_at`,
      [email, passwordHash, name || null, profession || 'Gestor de Tráfego', primary_niche || null, internal_context || null]
    );
    
    const user = result.rows[0];
    
    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Conta criada com sucesso',
      user: toUserPayload(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Fazer login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Buscar usuário
    const result = await query(
      `SELECT id, email, name, profession, primary_niche, internal_context, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Email ou senha incorretos' 
      });
    }
    
    const user = result.rows[0];
    
    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Email ou senha incorretos' 
      });
    }
    
    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login realizado com sucesso',
      user: toUserPayload(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Dados do usuário logado
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: toUserPayload(req.user)
  });
});

// PATCH /api/auth/me - Editar perfil profissional usado pelos prompts internos de IA
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = updateMeSchema.parse(req.body);

    const result = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        profession = COALESCE($2, profession),
        primary_niche = $3,
        internal_context = $4,
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, profession, primary_niche, internal_context`,
      [
        data.name === '' ? null : data.name,
        data.profession || null,
        data.primary_niche || null,
        data.internal_context || null,
        req.user.id
      ]
    );

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: toUserPayload(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
});

export default router;