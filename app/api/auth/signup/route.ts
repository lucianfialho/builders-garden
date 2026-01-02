import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db/client';
import { users, gardens, currency } from '@/lib/db/schema';
import { saveSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username } = body;

    // Validações
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, senha e nome de usuário são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: 'O nome de usuário deve ter entre 3 e 50 caracteres' },
        { status: 400 }
      );
    }

    // Hash da senha
    const passwordHash = await hash(password, 10);

    // Criar usuário (within a transaction seria melhor, mas vamos simplificar)
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        username,
        passwordHash,
      })
      .returning();

    if (!user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Criar jardim inicial do usuário
    await db.insert(gardens).values({
      userId: user.id,
      name: `Jardim de ${username}`,
      gridSize: 10, // Grid inicial 10x10
    });

    // Criar moeda inicial (seeds de boas-vindas)
    await db.insert(currency).values({
      userId: user.id,
      seeds: 100, // 100 seeds iniciais para começar
      lifetimeSeeds: 100,
    });

    // Criar sessão (cookie)
    await saveSession({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);

    // Erros de unique constraint (email ou username já existe)
    if (error.code === '23505') {
      if (error.detail?.includes('email')) {
        return NextResponse.json(
          { error: 'Este email já está em uso' },
          { status: 409 }
        );
      }
      if (error.detail?.includes('username')) {
        return NextResponse.json(
          { error: 'Este nome de usuário já está em uso' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}
