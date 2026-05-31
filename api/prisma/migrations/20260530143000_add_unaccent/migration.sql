-- habilita a extensao unaccent pra busca insensivel a acento (ex: 'salario' acha 'Salário').
-- usada pelo assistente (modulo assistant/tools.ts) nas buscas por texto e no match de categoria.
-- idempotente: nao falha se ja existir.
CREATE EXTENSION IF NOT EXISTS unaccent;
