#!/bin/sh
set -e

echo "🚀 Sunset CRM - Iniciando..."

# Aguardar banco de dados estar pronto
echo "⏳ Aguardando banco de dados..."
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRaw\`SELECT 1\`.then(() => { p.\$disconnect(); process.exit(0); }).catch(() => { p.\$disconnect(); process.exit(1); });
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Banco de dados não respondeu após $MAX_RETRIES tentativas"
        exit 1
    fi
    echo "  Tentativa $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done
echo "✅ Banco de dados conectado!"

# Rodar migrations
echo "📦 Aplicando migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "✅ Migrations aplicadas!"

# Seed opcional (apenas na primeira execução)
if [ "$RUN_SEED" = "true" ]; then
    echo "🌱 Rodando seed do banco..."
    npx prisma db seed --schema=./prisma/schema.prisma
    echo "✅ Seed concluído!"
fi

# Iniciar aplicação
echo "🌐 Iniciando servidor Next.js..."
exec node server.js
